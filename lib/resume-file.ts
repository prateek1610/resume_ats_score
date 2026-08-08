import { extractText, getDocumentProxy } from "unpdf";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_RESUME_TEXT_LENGTH = 60_000;
const MAX_DOCX_UNCOMPRESSED_SIZE = 25 * 1024 * 1024;
const MAX_DOCX_ENTRIES = 512;

const ALLOWED_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export function getFileExtension(filename: string) {
  return filename.toLowerCase().split(".").pop() ?? "";
}

export function validateResumeFile(file: File) {
  const extension = getFileExtension(file.name);
  if (!ALLOWED_TYPES[extension]) return "Upload a PDF or DOCX file.";
  if (!ALLOWED_TYPES[extension].includes(file.type)) return "The file type does not match its extension.";
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_FILE_SIZE) return "The file must be 10 MB or smaller.";
  return null;
}

export async function validateResumeFileSignature(file: File) {
  const extension = getFileExtension(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === "pdf") {
    const header = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
    if (!header.includes("%PDF-")) return "The PDF signature is invalid or the file is not a real PDF.";
    const pdfSource = new TextDecoder("latin1").decode(bytes);
    if (/\/(?:JavaScript|Launch|EmbeddedFile)\b/i.test(pdfSource)) {
      return "This PDF contains active or embedded content and cannot be processed safely.";
    }
  }
  if (extension === "docx") {
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return "The DOCX signature is invalid or the file is not a real DOCX document.";
    }
    const archiveError = inspectDocxArchive(bytes);
    if (archiveError) return archiveError;
  }
  return null;
}

function inspectDocxArchive(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEocdOffset = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= minimumEocdOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) return "The DOCX archive is incomplete or corrupted.";

  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entryCount < 1 || entryCount > MAX_DOCX_ENTRIES || centralOffset + centralSize > eocd) {
    return "The DOCX archive structure is invalid.";
  }

  const names = new Set<string>();
  let offset = centralOffset;
  let totalCompressed = 0;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > eocd || view.getUint32(offset, true) !== 0x02014b50) return "The DOCX archive structure is invalid.";
    const flags = view.getUint16(offset + 8, true);
    const compressed = view.getUint32(offset + 20, true);
    const uncompressed = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (flags & 0x1 || compressed === 0xffffffff || uncompressed === 0xffffffff || nextOffset > eocd) {
      return "Encrypted or ZIP64 DOCX files are not supported.";
    }
    const name = new TextDecoder(flags & 0x800 ? "utf-8" : "latin1").decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) return "The DOCX archive contains an unsafe file path.";
    names.add(name);
    totalCompressed += compressed;
    totalUncompressed += uncompressed;
    if (totalUncompressed > MAX_DOCX_UNCOMPRESSED_SIZE) return "The DOCX expands beyond the safe processing limit.";
    offset = nextOffset;
  }
  if (offset !== centralOffset + centralSize) return "The DOCX archive directory is inconsistent.";
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > 100) return "The DOCX compression ratio exceeds the safe processing limit.";
  if (!names.has("[Content_Types].xml") || !names.has("word/document.xml")) return "The file is a ZIP archive, not a valid DOCX document.";
  return null;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_RESUME_TEXT_LENGTH);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Resume parsing timed out.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function disposePdf(pdf: unknown) {
  const loadingTask = (pdf as {
    loadingTask?: { destroy?: () => Promise<void> };
  }).loadingTask;
  if (typeof loadingTask?.destroy === "function") {
    await loadingTask.destroy();
  }
}

export async function extractResumeText(file: File) {
  const extension = getFileExtension(file.name);
  const data = await file.arrayBuffer();
  let text = "";

  if (extension === "pdf") {
    const pdf = await withTimeout(
      getDocumentProxy(new Uint8Array(data), { maxImageSize: 16_777_216 }),
      6_000,
    );
    try {
      if (pdf.numPages > 15) {
        throw new Error("PDF resumes are limited to 15 pages.");
      }
      const extracted = await withTimeout(extractText(pdf, { mergePages: true }), 8_000);
      text = extracted.text;
    } finally {
      await disposePdf(pdf);
    }
  } else if (extension === "docx") {
    const mammoth = await import("mammoth");
    // The server bundle resolves Mammoth's Node entrypoint, whose unzip layer
    // expects the binary under `buffer` (the browser entrypoint uses
    // `arrayBuffer`). An ArrayBuffer is accepted by JSZip at runtime, so keep
    // the bytes zero-copy and expose them under the key used by this bundle.
    const extracted = await withTimeout(
      mammoth.extractRawText({ buffer: data as unknown as Buffer }),
      8_000,
    );
    text = extracted.value;
  }

  const normalized = normalizeExtractedText(text);
  if (normalized.length < 80) {
    throw new Error("We could not extract enough readable text. Try a text-based PDF or DOCX file.");
  }
  return normalized;
}

export function safeFilename(filename: string) {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^\.+/, "");
  return cleaned.slice(0, 120) || "resume";
}

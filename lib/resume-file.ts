import { extractText, getDocumentProxy } from "unpdf";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_RESUME_TEXT_LENGTH = 60_000;

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
  const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (extension === "pdf") {
    const header = new TextDecoder("latin1").decode(bytes.slice(0, 16));
    if (!header.includes("%PDF-")) return "The PDF signature is invalid or the file is not a real PDF.";
  }
  if (extension === "docx") {
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return "The DOCX signature is invalid or the file is not a real DOCX document.";
    }
  }
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
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned.slice(0, 120) || "resume";
}

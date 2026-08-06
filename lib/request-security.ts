const SAFE_RESUME_ERRORS = [
  "Resume parsing timed out.",
  "PDF resumes are limited to 15 pages.",
  "We could not extract enough readable text.",
];

export function requestId(request: Request) {
  const candidate = request.headers.get("cf-ray")?.slice(0, 80) ?? "";
  return /^[a-zA-Z0-9._:-]+$/.test(candidate) ? candidate : crypto.randomUUID();
}

export function isTrustedMutationRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  try {
    const expectedOrigin = new URL(request.url).origin;
    if (origin) return new URL(origin).origin === expectedOrigin;
    if (referer) return new URL(referer).origin === expectedOrigin;
    return false;
  } catch {
    return false;
  }
}

export function isContentType(request: Request, expected: string) {
  const mediaType = (request.headers.get("content-type") ?? "").split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === expected.toLowerCase();
}

export function hasAcceptableContentLength(request: Request, maximum: number) {
  const raw = request.headers.get("content-length");
  if (raw === null) return true;
  if (!/^\d+$/.test(raw)) return false;
  const size = Number(raw);
  return Number.isSafeInteger(size) && size >= 0 && size <= maximum;
}

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeded its processing limit.");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readRequestBytes(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function sanitizePlainText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function publicErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safe = SAFE_RESUME_ERRORS.find((candidate) => message.startsWith(candidate));
  return safe ?? "We could not analyze this resume. Please try again with a text-based PDF or DOCX.";
}

export function jsonResponse(body: unknown, status: number, id: string, extraHeaders?: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "cross-origin-resource-policy": "same-origin",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-request-id": id,
      ...extraHeaders,
    },
  });
}

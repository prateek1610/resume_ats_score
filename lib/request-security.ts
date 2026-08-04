const SAFE_RESUME_ERRORS = [
  "Resume parsing timed out.",
  "PDF resumes are limited to 15 pages.",
  "We could not extract enough readable text.",
];

export function requestId(request: Request) {
  return request.headers.get("cf-ray")?.slice(0, 80) || crypto.randomUUID();
}

export function isTrustedMutationRequest(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
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
      "x-content-type-options": "nosniff",
      "x-request-id": id,
      ...extraHeaders,
    },
  });
}

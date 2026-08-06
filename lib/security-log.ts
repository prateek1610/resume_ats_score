type LogLevel = "info" | "warn" | "error";
type SafeValue = string | number | boolean | null;

export function securityLog(level: LogLevel, event: string, requestId?: string, details: Record<string, SafeValue> = {}) {
  const record = {
    event: event.replace(/[^a-z0-9_:-]/gi, "").slice(0, 80),
    ...(requestId ? { requestId: requestId.slice(0, 80) } : {}),
    ...Object.fromEntries(Object.entries(details).slice(0, 12)),
    timestamp: new Date().toISOString(),
  };
  console[level](JSON.stringify(record));
}

export function errorType(error: unknown) {
  return error instanceof Error
    ? error.name.replace(/[^a-z0-9_:-]/gi, "").slice(0, 60) || "Error"
    : "UnknownError";
}

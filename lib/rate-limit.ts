import { getDbBinding } from "@/db";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

async function subjectDigest(subject: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(subject));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

export async function consumeRateLimit(scope: string, subject: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const db = await getDbBinding();
  const now = Date.now();
  const staleBefore = now - windowMs;
  const key = `${scope}:${await subjectDigest(subject.toLowerCase())}`;
  const row = await db.prepare(`INSERT INTO rate_limit_windows (key, scope, window_start, request_count, updated_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END,
      request_count = CASE WHEN window_start <= ? THEN 1 ELSE request_count + 1 END,
      updated_at = excluded.updated_at
    RETURNING window_start, request_count`)
    .bind(key, scope, now, now, staleBefore, staleBefore)
    .first<{ window_start: number; request_count: number }>();
  if (!row) throw new Error("Rate limit state is unavailable.");
  const retryAfterSeconds = Math.max(1, Math.ceil((row.window_start + windowMs - now) / 1000));
  return {
    allowed: row.request_count <= limit,
    limit,
    remaining: Math.max(0, limit - row.request_count),
    retryAfterSeconds,
  };
}

export async function cleanOldRateLimits() {
  const db = await getDbBinding();
  await db.prepare("DELETE FROM rate_limit_windows WHERE updated_at < ?").bind(Date.now() - 7 * 24 * 60 * 60 * 1000).run();
}

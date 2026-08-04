import { getDbBinding } from "@/db";
import { jsonResponse, requestId } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = requestId(request);
  const startedAt = Date.now();
  try {
    const db = await getDbBinding();
    await db.prepare("SELECT 1 AS healthy").first();
    return jsonResponse({ status: "ok", database: "available", responseTimeMs: Date.now() - startedAt }, 200, id);
  } catch (error) {
    console.error(JSON.stringify({ event: "health_check_failed", requestId: id, message: error instanceof Error ? error.message : "Unexpected error", timestamp: new Date().toISOString() }));
    return jsonResponse({ status: "degraded", database: "unavailable", responseTimeMs: Date.now() - startedAt }, 503, id);
  }
}

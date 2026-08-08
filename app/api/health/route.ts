import { getDbBinding } from "@/db";
import { jsonResponse, requestId } from "@/lib/request-security";
import { errorType, securityLog } from "@/lib/security-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = requestId(request);
  const startedAt = Date.now();
  try {
    const db = await getDbBinding();
    await db.prepare("SELECT 1 AS healthy").first();
    return jsonResponse({ status: "ok", database: "available", responseTimeMs: Date.now() - startedAt }, 200, id);
  } catch (error) {
    securityLog("error", "health_check_failed", id, { errorType: errorType(error) });
    return jsonResponse({ status: "degraded", database: "unavailable", responseTimeMs: Date.now() - startedAt }, 503, id);
  }
}

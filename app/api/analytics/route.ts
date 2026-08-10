import { z } from "zod";
import { normalizeAnalyticsPath, recordAnalyticsEvent } from "@/lib/analytics";
import { hasAcceptableContentLength, isContentType, isTrustedMutationRequest, jsonResponse, readRequestBytes, RequestBodyTooLargeError, requestId } from "@/lib/request-security";
import { errorType, securityLog } from "@/lib/security-log";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({ pathname: z.string().min(1).max(240).startsWith("/") }).strict();

export async function POST(request: Request) {
  const id = requestId(request);
  if (!isTrustedMutationRequest(request)) return jsonResponse({ error: "Request blocked." }, 403, id);
  if (!isContentType(request, "application/json")) return jsonResponse({ error: "JSON required." }, 415, id);
  if (!hasAcceptableContentLength(request, 1_024)) return jsonResponse({ error: "Request too large." }, 413, id);

  try {
    const bytes = await readRequestBytes(request, 1_024);
    const parsed = payloadSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    if (!parsed.success) return jsonResponse({ error: "Invalid analytics event." }, 400, id);
    await recordAnalyticsEvent("page_view", normalizeAnalyticsPath(parsed.data.pathname));
    return jsonResponse({ accepted: true }, 202, id);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return jsonResponse({ error: "Request too large." }, 413, id);
    securityLog("warn", "analytics_event_failed", id, { errorType: errorType(error) });
    return jsonResponse({ accepted: false }, 202, id);
  }
}

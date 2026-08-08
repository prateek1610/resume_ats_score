import { z } from "zod";
import { getAppUser } from "@/lib/app-auth";
import { listAllOwnedReports, removeAllReports } from "@/lib/reports";
import { hasAcceptableContentLength, isContentType, isTrustedMutationRequest, jsonResponse, readRequestBytes, RequestBodyTooLargeError, requestId } from "@/lib/request-security";
import { getResumeBucket } from "@/lib/storage";
import { errorType, securityLog } from "@/lib/security-log";

const confirmationSchema = z.object({ confirmation: z.literal("DELETE") });

export async function DELETE(request: Request) {
  const id = requestId(request);
  if (!isTrustedMutationRequest(request)) return jsonResponse({ error: "This request was blocked for your protection." }, 403, id);
  if (!isContentType(request, "application/json") || !hasAcceptableContentLength(request, 1_024)) return jsonResponse({ error: "Invalid request format." }, 415, id);
  const user = await getAppUser();
  if (!user) return jsonResponse({ error: "Sign in to delete your data." }, 401, id);

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(await readRequestBytes(request, 1_024)));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return jsonResponse({ error: "Invalid request format." }, 413, id);
    body = null;
  }
  const parsed = confirmationSchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "Type DELETE to confirm permanent deletion." }, 400, id);

  try {
    const reports = await listAllOwnedReports(user.email.toLowerCase());
    const bucket = await getResumeBucket();
    for (const report of reports) {
      if (!report.storageKey) continue;
      await bucket.delete(report.storageKey);
    }
    await removeAllReports(user.email.toLowerCase());
    securityLog("info", "account_data_deleted", id, { reportCount: reports.length });
    return jsonResponse({ deleted: true, reportsDeleted: reports.length }, 200, id);
  } catch (error) {
    securityLog("error", "account_delete_failed", id, { errorType: errorType(error) });
    return jsonResponse({ error: "We could not delete your data right now. Please retry." }, 500, id);
  }
}

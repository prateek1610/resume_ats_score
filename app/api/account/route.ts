import { z } from "zod";
import { getAppUser } from "@/lib/app-auth";
import { listAllOwnedReports, removeAllReports } from "@/lib/reports";
import { isTrustedMutationRequest, jsonResponse, requestId } from "@/lib/request-security";
import { getResumeBucket } from "@/lib/storage";

const confirmationSchema = z.object({ confirmation: z.literal("DELETE") });

export async function DELETE(request: Request) {
  const id = requestId(request);
  if (!isTrustedMutationRequest(request)) return jsonResponse({ error: "This request was blocked for your protection." }, 403, id);
  const user = await getAppUser();
  if (!user) return jsonResponse({ error: "Sign in to delete your data." }, 401, id);

  const parsed = confirmationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonResponse({ error: "Type DELETE to confirm permanent deletion." }, 400, id);

  try {
    const reports = await listAllOwnedReports(user.email.toLowerCase());
    const bucket = await getResumeBucket();
    for (const report of reports) {
      if (!report.storageKey) continue;
      await bucket.delete(report.storageKey);
    }
    await removeAllReports(user.email.toLowerCase());
    console.info(JSON.stringify({ event: "account_data_deleted", requestId: id, reportCount: reports.length, timestamp: new Date().toISOString() }));
    return jsonResponse({ deleted: true, reportsDeleted: reports.length }, 200, id);
  } catch (error) {
    console.error(JSON.stringify({ event: "account_delete_failed", requestId: id, message: error instanceof Error ? error.message : "Unexpected error", timestamp: new Date().toISOString() }));
    return jsonResponse({ error: "We could not delete your data right now. Please retry." }, 500, id);
  }
}

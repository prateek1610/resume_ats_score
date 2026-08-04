import { getAppUser } from "@/lib/app-auth";
import { getReport, removeReport } from "@/lib/reports";
import { isTrustedMutationRequest, jsonResponse, requestId } from "@/lib/request-security";
import { getResumeBucket } from "@/lib/storage";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestIdentifier = requestId(request);
  if (!isTrustedMutationRequest(request)) return jsonResponse({ error: "This request was blocked for your protection." }, 403, requestIdentifier);
  const user = await getAppUser();
  if (!user) return jsonResponse({ error: "Sign in to delete this report." }, 401, requestIdentifier);

  const { id } = await context.params;
  const ownerEmail = user.email.toLowerCase();
  const report = await getReport(id, ownerEmail);
  if (!report) return jsonResponse({ error: "Report not found." }, 404, requestIdentifier);

  if (report.storageKey) {
    try {
      await (await getResumeBucket()).delete(report.storageKey);
    } catch (error) {
      console.error(JSON.stringify({ event: "resume_file_delete_failed", reportId: id, message: error instanceof Error ? error.message : "Unexpected error" }));
      return jsonResponse({ error: "We could not delete the saved file. Please retry." }, 503, requestIdentifier);
    }
  }
  await removeReport(id, ownerEmail);
  return jsonResponse({ deleted: true }, 200, requestIdentifier);
}

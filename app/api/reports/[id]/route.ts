import { getAppUser } from "@/lib/app-auth";
import { getReport, removeReport } from "@/lib/reports";
import { isTrustedMutationRequest, jsonResponse, requestId } from "@/lib/request-security";
import { getResumeBucket } from "@/lib/storage";
import { errorType, securityLog } from "@/lib/security-log";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestIdentifier = requestId(request);
  const user = await getAppUser();
  if (!user) return jsonResponse({ error: "Sign in to view this report." }, 401, requestIdentifier);

  const { id } = await context.params;
  const report = await getReport(id, user.email.toLowerCase());
  if (!report) return jsonResponse({ error: "Report not found." }, 404, requestIdentifier);

  return jsonResponse({
    report: {
      id: report.id,
      filename: report.filename,
      structuredResume: report.structuredResume ?? null,
    },
  }, 200, requestIdentifier);
}

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
      securityLog("error", "resume_file_delete_failed", requestIdentifier, { errorType: errorType(error) });
      return jsonResponse({ error: "We could not delete the saved file. Please retry." }, 503, requestIdentifier);
    }
  }
  await removeReport(id, ownerEmail);
  return jsonResponse({ deleted: true }, 200, requestIdentifier);
}

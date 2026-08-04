import { getAppUser } from "@/lib/app-auth";
import { getReport } from "@/lib/reports";
import { jsonResponse, requestId } from "@/lib/request-security";
import { getResumeBucket } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  const user = await getAppUser();
  if (!user) return jsonResponse({ error: "Sign in to download this resume." }, 401, id);

  const { id: reportId } = await context.params;
  const report = await getReport(reportId, user.email.toLowerCase());
  if (!report?.storageKey) return jsonResponse({ error: "Resume not found." }, 404, id);

  const object = await (await getResumeBucket()).get(report.storageKey);
  if (!object) return jsonResponse({ error: "Resume file is unavailable." }, 404, id);

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? report.contentType,
      "content-disposition": `attachment; filename="${report.filename.replace(/["\\]/g, "")}"`,
      "etag": object.httpEtag,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "cross-origin-resource-policy": "same-origin",
      "x-request-id": id,
    },
  });
}

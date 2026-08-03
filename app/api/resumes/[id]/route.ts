import { getAppUser } from "@/lib/app-auth";
import { getReport } from "@/lib/reports";
import { getResumeBucket } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Sign in to download this resume." }, { status: 401 });

  const { id } = await context.params;
  const report = await getReport(id, user.email.toLowerCase());
  if (!report?.storageKey) return Response.json({ error: "Resume not found." }, { status: 404 });

  const object = await (await getResumeBucket()).get(report.storageKey);
  if (!object) return Response.json({ error: "Resume file is unavailable." }, { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? report.contentType,
      "content-disposition": `attachment; filename="${report.filename.replace(/["\\]/g, "")}"`,
      "etag": object.httpEtag,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

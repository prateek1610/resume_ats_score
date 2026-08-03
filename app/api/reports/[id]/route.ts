import { getAppUser } from "@/lib/app-auth";
import { removeReport } from "@/lib/reports";
import { getResumeBucket } from "@/lib/storage";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Sign in to delete this report." }, { status: 401 });

  const { id } = await context.params;
  const report = await removeReport(id, user.email.toLowerCase());
  if (!report) return Response.json({ error: "Report not found." }, { status: 404 });

  if (report.storageKey) {
    try {
      await (await getResumeBucket()).delete(report.storageKey);
    } catch (error) {
      console.error(JSON.stringify({ event: "resume_file_delete_failed", reportId: id, message: error instanceof Error ? error.message : "Unexpected error" }));
    }
  }
  return Response.json({ deleted: true });
}

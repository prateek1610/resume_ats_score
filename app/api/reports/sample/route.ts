import { getAppUser } from "@/lib/app-auth";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "@/lib/sample";
import { analyzeResume } from "@/lib/scoring";

export async function POST() {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Sign in to try the sample." }, { status: 401 });
  return Response.json({
    filename: "sample-operations-analyst-resume.pdf",
    analysis: analyzeResume(SAMPLE_RESUME, SAMPLE_JOB_DESCRIPTION),
  });
}

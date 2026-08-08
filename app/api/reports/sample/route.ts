import { getAppUser } from "@/lib/app-auth";
import { isTrustedMutationRequest, jsonResponse, requestId } from "@/lib/request-security";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "@/lib/sample";
import { analyzeResume } from "@/lib/scoring";
import { extractStructuredResume } from "@/lib/structured-resume";

export async function POST(request: Request) {
  const id = requestId(request);
  if (!isTrustedMutationRequest(request)) return jsonResponse({ error: "This request was blocked for your protection." }, 403, id);
  const user = await getAppUser();
  if (!user) return jsonResponse({ error: "Sign in to try the sample." }, 401, id);
  return jsonResponse({
    filename: "sample-operations-analyst-resume.pdf",
    analysis: analyzeResume(SAMPLE_RESUME, SAMPLE_JOB_DESCRIPTION),
    structuredResume: extractStructuredResume(SAMPLE_RESUME),
  }, 200, id);
}

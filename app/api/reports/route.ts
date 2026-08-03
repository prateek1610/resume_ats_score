import { z } from "zod";
import { getAppUser } from "@/lib/app-auth";
import { createReport } from "@/lib/reports";
import { analyzeResume } from "@/lib/scoring";
import { extractResumeText, safeFilename, validateResumeFile } from "@/lib/resume-file";
import { getResumeBucket, ownerStoragePrefix } from "@/lib/storage";

export const dynamic = "force-dynamic";

const jobDescriptionSchema = z.string().trim().max(20_000, "Job description is too long.");

function logError(event: string, error: unknown) {
  console.error(JSON.stringify({
    event,
    message: error instanceof Error ? error.message : "Unexpected error",
    timestamp: new Date().toISOString(),
  }));
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: "Sign in to analyze a resume." }, { status: 401 });

  let storageKey: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get("resume");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a resume file." }, { status: 400 });
    }

    const validationError = validateResumeFile(file);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const parsedJobDescription = jobDescriptionSchema.safeParse(form.get("jobDescription") ?? "");
    if (!parsedJobDescription.success) {
      return Response.json({ error: parsedJobDescription.error.issues[0]?.message ?? "Invalid job description." }, { status: 400 });
    }

    const resumeText = await extractResumeText(file);
    const analysis = analyzeResume(resumeText, parsedJobDescription.data);
    const id = crypto.randomUUID();
    const prefix = await ownerStoragePrefix(user.email);
    storageKey = `${prefix}/${id}/${safeFilename(file.name)}`;
    const fileBytes = await file.arrayBuffer();
    const bucket = await getResumeBucket();

    await bucket.put(storageKey, fileBytes, {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalFilename: safeFilename(file.name) },
    });

    const report = await createReport({
      id,
      ownerEmail: user.email.toLowerCase(),
      filename: safeFilename(file.name),
      storageKey,
      contentType: file.type,
      fileSize: file.size,
      mode: analysis.mode,
      jobDescription: parsedJobDescription.data || null,
      overallScore: analysis.overallScore,
      keywordScore: analysis.keywordScore,
      structureScore: analysis.structureScore,
      impactScore: analysis.impactScore,
      essentialsScore: analysis.essentialsScore,
      matchedKeywords: analysis.matchedKeywords,
      missingKeywords: analysis.missingKeywords,
      strengths: analysis.strengths,
      recommendations: analysis.recommendations,
      sections: analysis.sections,
      stats: analysis.stats,
      analysisDetails: analysis.details,
      createdAt: new Date(),
    });

    return Response.json({ report: { id: report.id, overallScore: report.overallScore } }, { status: 201 });
  } catch (error) {
    if (storageKey) {
      try { await (await getResumeBucket()).delete(storageKey); } catch { /* best-effort rollback */ }
    }
    logError("resume_analysis_failed", error);
    const message = error instanceof Error ? error.message : "We could not analyze this resume.";
    return Response.json({ error: message }, { status: 500 });
  }
}

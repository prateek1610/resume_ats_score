import { z } from "zod";
import { getAppUser } from "@/lib/app-auth";
import { claimExpiredReports, countReportsSince, createReport } from "@/lib/reports";
import { ANALYSIS_BURST_LIMIT, ANALYSIS_BURST_WINDOW_MS, DAILY_ANALYSIS_LIMIT, reportExpiryDate } from "@/lib/policy";
import { clientAddress, cleanOldRateLimits, consumeRateLimit } from "@/lib/rate-limit";
import { hasAcceptableContentLength, isContentType, isTrustedMutationRequest, jsonResponse, publicErrorMessage, readRequestBytes, RequestBodyTooLargeError, requestId, sanitizePlainText } from "@/lib/request-security";
import { analyzeResume } from "@/lib/scoring";
import { extractResumeText, MAX_FILE_SIZE, safeFilename, validateResumeFile, validateResumeFileSignature } from "@/lib/resume-file";
import { getResumeBucket, ownerStoragePrefix } from "@/lib/storage";
import { errorType, securityLog } from "@/lib/security-log";

export const dynamic = "force-dynamic";

const jobDescriptionSchema = z.string().trim().max(20_000, "Job description is too long.");

export async function POST(request: Request) {
  const id = requestId(request);
  if (!isTrustedMutationRequest(request)) return jsonResponse({ error: "This request was blocked for your protection." }, 403, id);
  const uploadContentType = request.headers.get("content-type") ?? "";
  if (!isContentType(request, "multipart/form-data") || !/;\s*boundary=(?:"[^"]{1,200}"|[^;\s]{1,200})(?:;|$)/i.test(uploadContentType)) {
    return jsonResponse({ error: "Upload requests must use multipart form data." }, 415, id);
  }
  if (!hasAcceptableContentLength(request, MAX_FILE_SIZE + 512 * 1024)) return jsonResponse({ error: "The upload request is too large." }, 413, id);
  const user = await getAppUser();
  if (!user) return jsonResponse({ error: "Sign in to analyze a resume." }, 401, id);

  let storageKey: string | null = null;
  try {
    const [userBurst, addressBurst] = await Promise.all([
      consumeRateLimit("resume-analysis-user", user.email, ANALYSIS_BURST_LIMIT, ANALYSIS_BURST_WINDOW_MS),
      consumeRateLimit("resume-analysis-address", clientAddress(request), ANALYSIS_BURST_LIMIT * 2, ANALYSIS_BURST_WINDOW_MS),
    ]);
    const burst = !userBurst.allowed ? userBurst : !addressBurst.allowed ? addressBurst : null;
    if (burst) {
      securityLog("warn", "resume_analysis_rate_limited", id);
      return jsonResponse({ error: `Too many analysis attempts. Try again in ${burst.retryAfterSeconds} seconds.` }, 429, id, { "retry-after": String(burst.retryAfterSeconds) });
    }

    const dayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const usedToday = await countReportsSince(user.email.toLowerCase(), dayStart);
    if (usedToday >= DAILY_ANALYSIS_LIMIT) {
      return jsonResponse({ error: `You have used today’s ${DAILY_ANALYSIS_LIMIT} free analyses. Try again after the rolling 24-hour window resets.` }, 429, id, { "retry-after": "3600" });
    }

    const requestBytes = await readRequestBytes(request, MAX_FILE_SIZE + 512 * 1024);
    const form = await new Response(requestBytes, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("resume");
    if (!(file instanceof File)) {
      return jsonResponse({ error: "Choose a resume file." }, 400, id);
    }

    const validationError = validateResumeFile(file);
    if (validationError) return jsonResponse({ error: validationError }, 400, id);
    const signatureError = await validateResumeFileSignature(file);
    if (signatureError) return jsonResponse({ error: signatureError }, 400, id);

    const parsedJobDescription = jobDescriptionSchema.safeParse(form.get("jobDescription") ?? "");
    if (!parsedJobDescription.success) {
      return jsonResponse({ error: parsedJobDescription.error.issues[0]?.message ?? "Invalid job description." }, 400, id);
    }
    const jobDescription = sanitizePlainText(parsedJobDescription.data);

    const resumeText = await extractResumeText(file);
    const analysis = analyzeResume(resumeText, jobDescription);
    const reportId = crypto.randomUUID();
    const prefix = await ownerStoragePrefix(user.email);
    storageKey = `${prefix}/${reportId}/${safeFilename(file.name)}`;
    const fileBytes = await file.arrayBuffer();
    const bucket = await getResumeBucket();

    await bucket.put(storageKey, fileBytes, {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalFilename: safeFilename(file.name) },
    });

    const report = await createReport({
      id: reportId,
      ownerEmail: user.email.toLowerCase(),
      filename: safeFilename(file.name),
      storageKey,
      contentType: file.type,
      fileSize: file.size,
      mode: analysis.mode,
      jobDescription: jobDescription || null,
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
      expiresAt: reportExpiryDate(),
    });

    securityLog("info", "resume_analysis_completed", id, { mode: analysis.mode, fileSize: file.size });
    try {
      await cleanOldRateLimits();
      const expired = await claimExpiredReports();
      for (const item of expired) if (item.storageKey) await bucket.delete(item.storageKey).catch(() => undefined);
    } catch {
      // Cleanup is best-effort and must not discard a successfully created report.
    }
    return jsonResponse({ report: { id: report.id, overallScore: report.overallScore }, quota: { limit: DAILY_ANALYSIS_LIMIT, remaining: Math.max(0, DAILY_ANALYSIS_LIMIT - usedToday - 1) } }, 201, id, {
      "x-ratelimit-limit": String(DAILY_ANALYSIS_LIMIT),
      "x-ratelimit-remaining": String(Math.max(0, DAILY_ANALYSIS_LIMIT - usedToday - 1)),
    });
  } catch (error) {
    if (storageKey) {
      try { await (await getResumeBucket()).delete(storageKey); } catch { /* best-effort rollback */ }
    }
    if (error instanceof RequestBodyTooLargeError) return jsonResponse({ error: "The upload request is too large." }, 413, id);
    securityLog("error", "resume_analysis_failed", id, { errorType: errorType(error) });
    return jsonResponse({ error: publicErrorMessage(error), requestId: id }, 500, id);
  }
}

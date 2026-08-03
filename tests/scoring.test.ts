import assert from "node:assert/strict";
import test from "node:test";
import { analyzeResume } from "../lib/scoring.ts";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "../lib/sample.ts";

test("scores a resume against a job description and identifies gaps", () => {
  const report = analyzeResume(SAMPLE_RESUME, SAMPLE_JOB_DESCRIPTION);
  assert.equal(report.mode, "job_match");
  assert.ok(report.overallScore >= 60 && report.overallScore <= 100);
  assert.ok(report.matchedKeywords.includes("excel"));
  assert.ok(report.missingKeywords.includes("sql"));
  assert.ok(report.recommendations.some((item) => item.category === "keywords"));
  assert.ok(report.strengths.some((item) => /measurable|action|keyword/i.test(item)));
  assert.ok(report.sections.some((section) => section.name === "Experience" && section.score >= 70));
  assert.ok(report.recommendations.every((item) => item.why));
  assert.match(report.details.targetRole, /Operations Analyst/i);
  assert.ok(report.details.requirementEvidence.some((item) => item.requirement === "Excel" && item.status === "supported" && item.evidence.length > 0));
  assert.ok(report.details.requirementEvidence.some((item) => item.requirement === "SQL" && item.status === "missing"));
  assert.ok(report.details.requirementEvidence.some((item) => item.requirement === "Power BI" && item.status === "missing"));
  assert.ok(report.details.roleFitScore >= 0 && report.details.roleFitScore <= 100);
  assert.match(report.details.roleFitVerdict, /match|aligned|stretch/i);
  assert.ok(report.details.mismatches.some((item) => item.requirement === "SQL"));
  assert.ok(report.details.requirementEvidence.some((item) => item.requirement === "Analyzing support metrics" && item.category === "responsibility"));
  assert.ok(report.details.contextSummary.includes("priority requirements"));
  assert.ok(report.details.bulletInsights.length >= 4);
  assert.ok(report.details.bulletInsights.some((item) => item.score >= 80 && item.signals.includes("Quantified")));
  assert.deepEqual(report.details.resumeReview.dimensions.map((item) => item.id), ["clarity", "impact", "action_language", "formatting", "keywords", "tone", "redundancy"]);
  assert.ok(report.details.resumeReview.strengths.some((item) => item.line.includes("32%") && /Experience · line \d+/.test(item.location)));
  assert.ok(report.details.resumeReview.areasToImprove.every((item) => item.location && item.line && item.suggestion));
  assert.ok(report.details.resumeReview.suggestedRewrites.some((item) => item.original.includes("dashboards") && /reports or dashboards/i.test(item.improved) && item.improved.includes("[")));
  assert.ok(report.details.resumeReview.suggestedAdditions.length >= 2 && report.details.resumeReview.suggestedAdditions.length <= 4);
  assert.ok(report.details.resumeReview.missingElements.some((item) => item.label === "Quantified achievements" && item.status === "present"));
});

test("standalone analysis does not invent missing job keywords", () => {
  const report = analyzeResume(SAMPLE_RESUME);
  assert.equal(report.mode, "standalone");
  assert.deepEqual(report.missingKeywords, []);
  assert.ok(report.structureScore >= 70);
  assert.ok(report.stats.metricCount >= 3);
  assert.equal(report.stats.weakPhraseCount, 0);
  assert.equal(report.details.requirementEvidence.length, 0);
  assert.match(report.details.contextSummary, /without a job description/i);
});

test("flags missing essentials and weak impact in a sparse resume", () => {
  const report = analyzeResume("Alex Doe\nI worked in an office and helped customers.");
  assert.ok(report.overallScore < 60);
  assert.ok(report.recommendations.some((item) => item.id === "contact-details"));
  assert.ok(report.recommendations.some((item) => item.id === "missing-sections"));
  assert.ok(report.recommendations.some((item) => item.id === "quantify-impact"));
  assert.ok(report.sections.some((section) => section.status === "missing"));
});

test("detects weak language, first-person writing, and dense bullets", () => {
  const report = analyzeResume(`Taylor Doe\ntaylor@example.com\n+91 9876543210\n\nSUMMARY\nI am a hard working professional who helped with customer support.\n\nEXPERIENCE\n- I was responsible for handling a very large number of different customer support activities and worked on many operational tasks with several other people across the company to ensure that all requests were eventually completed.\n\nEDUCATION\nBachelor of Commerce\n\nSKILLS\nCustomer service, communication`);
  assert.ok(report.stats.weakPhraseCount >= 2);
  assert.ok(report.stats.firstPersonCount >= 2);
  assert.ok(report.stats.longBulletCount >= 1);
  assert.ok(report.recommendations.some((item) => item.id === "weak-language"));
  assert.ok(report.recommendations.some((item) => item.id === "long-bullets"));
  assert.ok(report.details.bulletInsights[0].score < 60);
  assert.match(report.details.bulletInsights[0].guidance, /Rewrite as/i);
  assert.ok(report.details.riskFlags.some((item) => item.title === "Passive positioning"));
  assert.ok(report.details.resumeReview.dimensions.find((item) => item.id === "tone")!.score < 80);
  assert.ok(report.details.resumeReview.areasToImprove.some((item) => item.dimension === "tone" && item.line.includes("I was responsible")));
  assert.ok(report.details.resumeReview.suggestedRewrites.some((item) => item.original.includes("responsible for") && item.improved.includes("[")));
});

test("detects repeated bullet language and ties it to a specific line", () => {
  const report = analyzeResume("Sam Lee\n+91 9876543210 | sam@example.com\n\nSUMMARY\nOperations professional supporting customer teams and internal workflows.\n\nEXPERIENCE\n• Managed customer onboarding for new accounts.\n• Managed customer reporting for account leaders.\n• Managed customer escalations with support teams.\n\nEDUCATION\nBachelor of Commerce\n\nSKILLS\nCustomer service, communication, reporting");
  const redundancy = report.details.resumeReview.dimensions.find((item) => item.id === "redundancy")!;
  assert.ok(redundancy.score < 100);
  assert.match(redundancy.summary, /managed|customer/i);
  assert.ok(report.details.resumeReview.areasToImprove.some((item) => item.dimension === "redundancy" && /appears across 3 bullets/i.test(item.suggestion)));
});

test("detects a genuine role mismatch and lists unsupported job requirements", () => {
  const teachingResume = `Arpita Bhatt
arpita@example.com | +91 9876543210

SUMMARY
Primary school teacher with two years of experience in classroom management and curriculum planning.

EXPERIENCE
Teacher, City School | 2024–Present
• Taught English to 90 students across three classes.
• Designed lesson plans and improved student participation by 20%.

EDUCATION
Master of Commerce, B.Ed

SKILLS
Teaching, communication, classroom management, curriculum planning`;
  const softwareJob = `Senior Software Engineer
We require 5+ years of experience building production web applications. Must have TypeScript, React, Node.js, SQL and AWS experience. Responsibilities include designing scalable APIs, reviewing code, mentoring engineers, and deploying cloud services. Bachelor's degree in Computer Science required.`;

  const report = analyzeResume(teachingResume, softwareJob);
  assert.match(report.details.targetRole, /Senior Software Engineer/i);
  assert.equal(report.details.resumeProfile, "Education");
  assert.ok(report.details.roleFitScore < 30);
  assert.equal(report.details.roleFitVerdict, "Low current match");
  assert.ok(report.details.mismatches.some((item) => item.category === "role" && item.impact === "critical"));
  for (const requirement of ["TypeScript", "React", "Node.js", "AWS", "Designing scalable APIs", "Reviewing code", "Bachelor's degree in Computer Science"]) {
    assert.ok(report.details.requirementEvidence.some((item) => item.requirement === requirement && item.status === "missing"), requirement);
  }
});

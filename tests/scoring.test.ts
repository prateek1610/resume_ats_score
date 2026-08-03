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
  assert.ok(report.details.contextSummary.includes("priority requirements"));
  assert.ok(report.details.bulletInsights.length >= 4);
  assert.ok(report.details.bulletInsights.some((item) => item.score >= 80 && item.signals.includes("Quantified")));
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
});

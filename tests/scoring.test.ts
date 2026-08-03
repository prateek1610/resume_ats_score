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
});

test("standalone analysis does not invent missing job keywords", () => {
  const report = analyzeResume(SAMPLE_RESUME);
  assert.equal(report.mode, "standalone");
  assert.deepEqual(report.missingKeywords, []);
  assert.ok(report.structureScore >= 70);
  assert.ok(report.stats.metricCount >= 3);
});

test("flags missing essentials and weak impact in a sparse resume", () => {
  const report = analyzeResume("Alex Doe\nI worked in an office and helped customers.");
  assert.ok(report.overallScore < 60);
  assert.ok(report.recommendations.some((item) => item.id === "contact-details"));
  assert.ok(report.recommendations.some((item) => item.id === "missing-sections"));
  assert.ok(report.recommendations.some((item) => item.id === "quantify-impact"));
});

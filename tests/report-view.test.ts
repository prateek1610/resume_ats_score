import assert from "node:assert/strict";
import test from "node:test";
import { isReportView, REPORT_VIEWS } from "../lib/report-view.ts";

test("accepts every focused report workspace route", () => {
  assert.deepEqual(REPORT_VIEWS, ["overview", "job-match", "review", "rewrites", "checklist", "parsed-resume"]);
  for (const view of REPORT_VIEWS) assert.equal(isReportView(view), true);
});

test("rejects unknown report routes", () => {
  for (const view of ["", "all", "settings", "../dashboard", "parsed_resume"]) assert.equal(isReportView(view), false);
});

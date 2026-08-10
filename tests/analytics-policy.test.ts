import assert from "node:assert/strict";
import test from "node:test";
import { isAnalyticsAdmin, normalizeAnalyticsPath } from "../lib/analytics-policy.ts";

test("normalizes routes without retaining report identifiers", () => {
  assert.equal(normalizeAnalyticsPath("/"), "landing");
  assert.equal(normalizeAnalyticsPath("/reports/private-report-id/overview"), "report");
  assert.equal(normalizeAnalyticsPath("/auth/callback"), "login");
  assert.equal(normalizeAnalyticsPath("/unknown/private-value"), "other");
});

test("allows only explicitly configured analytics administrators", () => {
  const configured = "owner@example.com, second@example.com";
  assert.equal(isAnalyticsAdmin("OWNER@example.com", configured), true);
  assert.equal(isAnalyticsAdmin("member@example.com", configured), false);
  assert.equal(isAnalyticsAdmin("owner@example.com", ""), false);
});

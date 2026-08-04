import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedMutationRequest, publicErrorMessage, sanitizePlainText } from "../lib/request-security.ts";

test("blocks cross-site mutation requests and accepts same-origin requests", () => {
  assert.equal(isTrustedMutationRequest(new Request("https://resumelens.test/api/reports", { headers: { origin: "https://evil.test", "sec-fetch-site": "cross-site" } })), false);
  assert.equal(isTrustedMutationRequest(new Request("https://resumelens.test/api/reports", { headers: { origin: "https://resumelens.test", "sec-fetch-site": "same-origin" } })), true);
});

test("sanitizes control characters while preserving useful line breaks", () => {
  assert.equal(sanitizePlainText(" Role\u0000 description  \n\n\n\n requirement "), "Role description\n\n\n requirement");
});

test("does not expose unexpected infrastructure errors", () => {
  assert.match(publicErrorMessage(new Error("D1 binding password=secret")), /could not analyze/i);
  assert.equal(publicErrorMessage(new Error("Resume parsing timed out.")), "Resume parsing timed out.");
});

import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("renders the ResumeLens landing journey", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("landing", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /See what your resume proves/);
  assert.match(html, /Analyze my resume/);
  assert.match(html, /7 dimensions/);
  assert.match(html, /Line-level/);
  assert.match(html, /Preview a full report/);
  assert.match(html, /\/login\?return_to=%2Fdashboard/);
  assert.match(html, /Create account/);
  assert.match(html, /10 free analyses\/day/);
  assert.match(html, /retained for 30 days/);
  assert.match(html, /href="\/privacy"/);
  assert.match(html, /href="\/terms"/);
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("renders public privacy and terms pages", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("legal", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const environment = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const executionContext = { waitUntil() {}, passThroughOnException() {} };

  const privacyResponse = await worker.fetch(
    new Request("http://localhost/privacy", { headers: { accept: "text/html" } }),
    environment,
    executionContext,
  );
  const privacyHtml = await privacyResponse.text();
  assert.equal(privacyResponse.status, 200);
  assert.match(privacyHtml, /Privacy Policy/);
  assert.match(privacyHtml, /New reports expire 30 days after creation/);
  assert.match(privacyHtml, /permanently delete all reports and resume files/);

  const termsResponse = await worker.fetch(
    new Request("http://localhost/terms", { headers: { accept: "text/html" } }),
    environment,
    executionContext,
  );
  const termsHtml = await termsResponse.text();
  assert.equal(termsResponse.status, 200);
  assert.match(termsHtml, /Terms of Use/);
  assert.match(termsHtml, /10 saved analyses per rolling 24-hour period/);
  assert.match(termsHtml, /does not guarantee interviews/);
});

test("health endpoint fails closed without a database binding", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("health", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/health"),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.deepEqual(Object.keys(payload).sort(), ["database", "responseTimeMs", "status"]);
  assert.equal(payload.status, "degraded");
  assert.equal(payload.database, "unavailable");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("renders a complete and safe login journey", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("login", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/login?return_to=%2Fdashboard", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Sign in to continue/);
  assert.match(html, /Continue with ChatGPT/);
  assert.match(html, /signin-with-chatgpt\?return_to=%2Fdashboard/);
  assert.match(html, /Create free account/);
});

test("renders all configured public authentication methods", async () => {
  const previous = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY,
    origin: process.env.AUTH_SITE_URL,
  };
  process.env.SUPABASE_URL = "https://localhost:9";
  process.env.SUPABASE_PUBLISHABLE_KEY = "integration-test-publishable-key";
  process.env.AUTH_SITE_URL = "http://localhost";

  try {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("configured-auth", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(
      new Request("http://localhost/signup?return_to=%2Fdashboard", { headers: { accept: "text/html" } }),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Continue with Google/);
    assert.match(html, /or continue with email/);
    assert.match(html, /Email link/);
    assert.match(html, /action="\/auth\/google"/);
    assert.match(html, /action="\/auth\/password\?intent=signup"/);
    assert.match(html, /At least 12 characters/);
    assert.match(html, /Confirm password/);
  } finally {
    restoreEnvironment("SUPABASE_URL", previous.url);
    restoreEnvironment("SUPABASE_PUBLISHABLE_KEY", previous.key);
    restoreEnvironment("AUTH_SITE_URL", previous.origin);
  }
});

test("protected dashboard redirects through the ResumeLens login screen", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("protected", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/dashboard", { redirect: "manual", headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.ok([302, 303, 307, 308].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/login\?return_to=%2Fdashboard$/);
});

test("returns a complete authenticated sample analysis", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("sample", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/reports/sample", {
      method: "POST",
      headers: { "oai-authenticated-user-email": "test@example.com" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.analysis.mode, "job_match");
  assert.equal(typeof payload.analysis.overallScore, "number");
  assert.ok(payload.analysis.recommendations.length > 0);
  assert.match(payload.analysis.details.targetRole, /Operations Analyst/i);
  assert.ok(payload.analysis.details.requirementEvidence.length > 0);
  assert.ok(payload.analysis.details.bulletInsights.length > 0);
  assert.equal(typeof payload.analysis.details.roleFitScore, "number");
  assert.ok(payload.analysis.details.mismatches.some((item) => item.requirement === "SQL"));
  assert.equal(payload.analysis.details.resumeReview.dimensions.length, 7);
  assert.ok(payload.analysis.details.resumeReview.strengths.some((item) => item.location.includes("line")));
  assert.ok(payload.analysis.details.resumeReview.suggestedRewrites.some((item) => item.original && item.improved));
  assert.ok(payload.analysis.details.resumeReview.missingElements.some((item) => item.label === "Professional summary"));
});

function restoreEnvironment(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

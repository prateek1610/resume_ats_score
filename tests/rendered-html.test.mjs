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
  assert.match(html, /Know what recruiters/);
  assert.match(html, /Upload resume/);
  assert.match(html, /\/login\?return_to=%2Fdashboard/);
  assert.match(html, /Create account/);
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
});

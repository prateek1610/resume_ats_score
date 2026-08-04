import assert from "node:assert/strict";
import test from "node:test";
import { MAX_FILE_SIZE, safeFilename, validateResumeFile, validateResumeFileSignature } from "../lib/resume-file.ts";

function fakeFile(name: string, type: string, size: number) {
  return { name, type, size } as File;
}

test("accepts valid PDF and DOCX metadata", () => {
  assert.equal(validateResumeFile(fakeFile("resume.pdf", "application/pdf", 1200)), null);
  assert.equal(validateResumeFile(fakeFile("resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1200)), null);
});

test("rejects mismatched, empty, and oversized files", () => {
  assert.match(validateResumeFile(fakeFile("resume.pdf", "text/plain", 1200)) ?? "", /does not match/i);
  assert.match(validateResumeFile(fakeFile("resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 0)) ?? "", /empty/i);
  assert.match(validateResumeFile(fakeFile("resume.pdf", "application/pdf", MAX_FILE_SIZE + 1)) ?? "", /10 MB/i);
});

test("sanitizes uploaded filenames", () => {
  assert.equal(safeFilename("My Resume (Final)!!.pdf"), "My-Resume-Final-.pdf");
  assert.ok(safeFilename("a".repeat(200) + ".pdf").length <= 120);
});

test("checks PDF and DOCX content signatures instead of trusting metadata", async () => {
  const pdf = new File([new TextEncoder().encode("%PDF-1.7\nresume")], "resume.pdf", { type: "application/pdf" });
  const docx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])], "resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const fakePdf = new File([new TextEncoder().encode("not a pdf")], "resume.pdf", { type: "application/pdf" });
  assert.equal(await validateResumeFileSignature(pdf), null);
  assert.equal(await validateResumeFileSignature(docx), null);
  assert.match(await validateResumeFileSignature(fakePdf) ?? "", /signature is invalid/i);
});

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
  const docx = new File([minimalDocxArchive()], "resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const fakePdf = new File([new TextEncoder().encode("not a pdf")], "resume.pdf", { type: "application/pdf" });
  const activePdf = new File([new TextEncoder().encode("%PDF-1.7\n/JavaScript")], "resume.pdf", { type: "application/pdf" });
  assert.equal(await validateResumeFileSignature(pdf), null);
  assert.equal(await validateResumeFileSignature(docx), null);
  assert.match(await validateResumeFileSignature(fakePdf) ?? "", /signature is invalid/i);
  assert.match(await validateResumeFileSignature(activePdf) ?? "", /active or embedded content/i);
});

function minimalDocxArchive() {
  const names = ["[Content_Types].xml", "word/document.xml"];
  const local = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  const records = names.map((name) => {
    const encoded = new TextEncoder().encode(name);
    const record = new Uint8Array(46 + encoded.length);
    const view = new DataView(record.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(28, encoded.length, true);
    record.set(encoded, 46);
    return record;
  });
  const centralSize = records.reduce((total, record) => total + record.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, records.length, true);
  eocdView.setUint16(10, records.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, local.length, true);
  const archive = new Uint8Array(local.length + centralSize + eocd.length);
  let offset = 0;
  archive.set(local, offset); offset += local.length;
  for (const record of records) { archive.set(record, offset); offset += record.length; }
  archive.set(eocd, offset);
  return archive;
}

import assert from "node:assert/strict";
import test from "node:test";
import { extractStructuredResume } from "../lib/structured-resume.ts";

const COMPLETE_RESUME = `Jordan Lee
jordan.lee@example.com | +91 98765 43210 | linkedin.com/in/jordanlee
Lucknow, Uttar Pradesh, India

PROFESSIONAL SUMMARY
Operations specialist with five years of experience improving customer workflows and reporting accuracy.

CORE SKILLS
Customer service, Excel, SQL, Power BI, stakeholder management

PROFESSIONAL EXPERIENCE
Operations Specialist, Northstar Services | Jan 2022–Present
• Improved first-response time by 32% by redesigning ticket triage.
• Built weekly Excel dashboards for six operations leaders.

Customer Support Associate, BrightDesk | 2019–2021
• Resolved 55+ weekly customer requests while maintaining 96% satisfaction.

EDUCATION
Bachelor of Commerce, City University | 2018

CERTIFICATIONS
ITIL 4 Foundation — PeopleCert | 2024`;

test("extracts a source-linked structured resume without inventing fields", () => {
  const result = extractStructuredResume(COMPLETE_RESUME);

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.contact.name?.value, "Jordan Lee");
  assert.equal(result.contact.emails[0]?.value, "jordan.lee@example.com");
  assert.match(result.contact.phones[0]?.value ?? "", /98765 43210/);
  assert.equal(result.contact.location?.value, "Lucknow, Uttar Pradesh, India");
  assert.equal(result.contact.links[0]?.kind, "linkedin");
  assert.match(result.summary?.text ?? "", /five years of experience/i);
  assert.deepEqual(result.skills.map((skill) => skill.value), ["Customer service", "Excel", "SQL", "Power BI", "stakeholder management"]);

  assert.equal(result.experience.length, 2);
  assert.equal(result.experience[0]?.title?.value, "Operations Specialist");
  assert.equal(result.experience[0]?.organization?.value, "Northstar Services");
  assert.equal(result.experience[0]?.dateRange?.value, "Jan 2022–Present");
  assert.equal(result.experience[0]?.bullets.length, 2);
  assert.equal(result.experience[1]?.bullets[0]?.text, "Resolved 55+ weekly customer requests while maintaining 96% satisfaction.");

  assert.equal(result.education[0]?.qualification?.value, "Bachelor of Commerce");
  assert.equal(result.education[0]?.institution?.value, "City University");
  assert.equal(result.certifications[0]?.name.value, "ITIL 4 Foundation");
  assert.equal(result.certifications[0]?.issuer?.value, "PeopleCert");
  assert.equal(result.bullets.length, 3);
  assert.ok(result.bullets.every((bullet) => bullet.sourceLine > 0 && bullet.id === `bullet-${bullet.sourceLine}`));
  assert.ok(result.extraction.confidence >= 90);
  assert.deepEqual(result.extraction.warnings, []);
});

test("recognizes common alternate section headings", () => {
  const result = extractStructuredResume(`Asha Mehta
asha@example.com | +91 90000 00000

CAREER OBJECTIVE
Commerce graduate seeking an entry-level operations role.

TECHNICAL COMPETENCIES
Microsoft Excel | Communication | Reporting

EMPLOYMENT HISTORY
Operations Intern @ Example Services | 2025–Present
- Prepared weekly reports for the service team.

ACADEMIC QUALIFICATIONS
Master of Commerce, Example University

LICENSES & CERTIFICATIONS
CCC — NIELIT | 2025`);

  assert.match(result.summary?.text ?? "", /operations role/i);
  assert.equal(result.skills.length, 3);
  assert.equal(result.experience[0]?.title?.value, "Operations Intern");
  assert.equal(result.education[0]?.qualification?.value, "Master of Commerce");
  assert.equal(result.certifications[0]?.name.value, "CCC");
});

test("returns null and empty collections when evidence is absent", () => {
  const result = extractStructuredResume(`Resume
Anonymous candidate

Looking for opportunities.`);

  assert.equal(result.contact.emails.length, 0);
  assert.equal(result.contact.phones.length, 0);
  assert.equal(result.summary, null);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.experience, []);
  assert.deepEqual(result.education, []);
  assert.deepEqual(result.certifications, []);
  assert.ok(result.extraction.warnings.some((warning) => /email/i.test(warning)));
  assert.ok(result.extraction.confidence < 30);
});

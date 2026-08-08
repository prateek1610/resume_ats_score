export type ExtractionConfidence = "high" | "medium" | "low";

export type ExtractedValue = {
  value: string;
  sourceLine: number;
  confidence: ExtractionConfidence;
};

export type ResumeLink = ExtractedValue & {
  kind: "linkedin" | "github" | "portfolio" | "other";
};

export type ResumeBullet = {
  id: string;
  text: string;
  sourceLine: number;
  section: StructuredSectionName;
};

export type StructuredSectionName = "header" | "summary" | "skills" | "experience" | "education" | "certifications" | "projects" | "other";

export type StructuredSection = {
  name: StructuredSectionName;
  heading: string;
  headingLine: number;
  startLine: number;
  endLine: number;
};

export type ExperienceEntry = {
  title: ExtractedValue | null;
  organization: ExtractedValue | null;
  location: ExtractedValue | null;
  dateRange: ExtractedValue | null;
  details: ExtractedValue[];
  bullets: ResumeBullet[];
  sourceLines: number[];
};

export type EducationEntry = {
  qualification: ExtractedValue | null;
  institution: ExtractedValue | null;
  dateRange: ExtractedValue | null;
  details: ExtractedValue[];
  sourceLines: number[];
};

export type CertificationEntry = {
  name: ExtractedValue;
  issuer: ExtractedValue | null;
  date: ExtractedValue | null;
  sourceLine: number;
};

export type StructuredResume = {
  schemaVersion: 1;
  contact: {
    name: ExtractedValue | null;
    emails: ExtractedValue[];
    phones: ExtractedValue[];
    location: ExtractedValue | null;
    links: ResumeLink[];
  };
  summary: {
    text: string;
    sourceLines: number[];
    confidence: ExtractionConfidence;
  } | null;
  skills: Array<ExtractedValue>;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  bullets: ResumeBullet[];
  sections: StructuredSection[];
  extraction: {
    confidence: number;
    warnings: string[];
    unclassifiedLines: number[];
  };
};

type ResumeLine = {
  lineNumber: number;
  text: string;
  content: string;
  isBullet: boolean;
  isBlank: boolean;
};

type SectionDefinition = {
  name: Exclude<StructuredSectionName, "header" | "other">;
  pattern: RegExp;
};

const SECTION_DEFINITIONS: SectionDefinition[] = [
  { name: "summary", pattern: /^(?:professional\s+|career\s+|executive\s+)?(?:summary|profile|objective|overview|about me)$/i },
  { name: "skills", pattern: /^(?:(?:technical|professional|core|key)\s+)?(?:skills|competencies|expertise|technologies|tools)$/i },
  { name: "experience", pattern: /^(?:(?:professional|work|employment|career)\s+)?(?:experience|history)|employment history$/i },
  { name: "education", pattern: /^(?:education|academic background|academic qualifications|qualifications)$/i },
  { name: "certifications", pattern: /^(?:certifications?|certificates?|licenses?(?:\s*&\s*certifications?)?|professional development|training)$/i },
  { name: "projects", pattern: /^(?:projects|selected projects|key projects|portfolio)$/i },
];

const BULLET_PATTERN = /^\s*(?:[-•▪◦●*]|\d+[.)])\s+/;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const URL_PATTERN = /(?:(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/[^\s|,;]+|github\.com\/[^\s|,;]+|[a-z0-9.-]+\.(?:com|net|org|io|in|dev|me)\/[^\s|,;]+))/gi;
const DATE_TOKEN = "(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?\\s+)?(?:19|20)\\d{2}|present|current|now";
const DATE_RANGE_PATTERN = new RegExp(`\\b(?:${DATE_TOKEN})\\s*(?:[-–—]|to)\\s*(?:${DATE_TOKEN})\\b`, "i");
const SINGLE_DATE_PATTERN = new RegExp(`\\b(?:${DATE_TOKEN})\\b`, "i");
const DEGREE_PATTERN = /\b(?:bachelor|master|doctorate|ph\.?d|mba|b\.?\s?(?:com|ed|a|sc|tech|e)|m\.?\s?(?:com|ed|a|sc|tech|e)|diploma|degree|higher secondary|high school|class x{1,2})\b/i;
const INSTITUTION_PATTERN = /\b(?:university|college|school|institute|academy|polytechnic)\b/i;
const ROLE_PATTERN = /\b(?:analyst|associate|assistant|consultant|coordinator|designer|developer|director|engineer|executive|lead|manager|officer|specialist|supervisor|teacher|trainee|intern|administrator|representative|advisor|counselor)\b/i;

function confidenceForScore(score: number): ExtractionConfidence {
  return score >= 0.8 ? "high" : score >= 0.5 ? "medium" : "low";
}

function value(text: string, sourceLine: number, confidence: ExtractionConfidence): ExtractedValue {
  return { value: text.trim(), sourceLine, confidence };
}

function uniqueValues(items: ExtractedValue[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildLines(resumeText: string): ResumeLine[] {
  return resumeText.replace(/\r/g, "").split("\n").map((raw, index) => {
    const text = raw.trim();
    const isBullet = BULLET_PATTERN.test(raw);
    return {
      lineNumber: index + 1,
      text,
      content: isBullet ? text.replace(BULLET_PATTERN, "").trim() : text,
      isBullet,
      isBlank: !text,
    };
  });
}

function sectionDefinition(text: string) {
  if (text.length > 64) return undefined;
  const normalized = text.replace(/:$/, "").trim();
  return SECTION_DEFINITIONS.find((definition) => definition.pattern.test(normalized));
}

function partitionSections(lines: ResumeLine[]) {
  const blocks = new Map<StructuredSectionName, ResumeLine[]>();
  const sections: StructuredSection[] = [];
  const headingLines = new Set<number>();
  let current: StructuredSectionName = "header";
  let currentHeading: { name: StructuredSectionName; heading: string; line: number } | null = null;

  for (const line of lines) {
    if (!line.isBlank) {
      const definition = sectionDefinition(line.text);
      if (definition) {
        if (currentHeading) {
          sections.push({ name: currentHeading.name, heading: currentHeading.heading, headingLine: currentHeading.line, startLine: currentHeading.line + 1, endLine: line.lineNumber - 1 });
        }
        current = definition.name;
        currentHeading = { name: current, heading: line.text, line: line.lineNumber };
        headingLines.add(line.lineNumber);
        continue;
      }
    }
    blocks.set(current, [...(blocks.get(current) ?? []), line]);
  }
  if (currentHeading) {
    sections.push({ name: currentHeading.name, heading: currentHeading.heading, headingLine: currentHeading.line, startLine: currentHeading.line + 1, endLine: lines.length });
  }
  return { blocks, sections, headingLines };
}

function looksLikeName(line: ResumeLine) {
  if (!line.text || line.text.length > 70 || sectionDefinition(line.text)) return false;
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(line.text) || /(?:\+?\d[\d\s().-]{6,}\d)/.test(line.text) || /(?:linkedin\.com|github\.com|https?:\/\/|www\.)/i.test(line.text)) return false;
  if (/\b(?:resume|curriculum vitae|cv|profile)\b/i.test(line.text) || /[|@]/.test(line.text) || /\d/.test(line.text)) return false;
  const words = line.text.match(/[\p{L}][\p{L}'.-]*/gu) ?? [];
  return words.length >= 2 && words.length <= 6;
}

function findLocation(headerLines: ResumeLine[], ignoredLines: Set<number>) {
  const locationPattern = /^(?:[\p{L} .'-]+,\s*){1,2}[\p{L} .'-]+$/u;
  const countryPattern = /\b(?:india|united states|usa|uk|united kingdom|canada|australia|uae|remote)\b/i;
  const candidate = headerLines.find((line) => {
    if (!line.text || ignoredLines.has(line.lineNumber) || line.text.length > 90) return false;
    return locationPattern.test(line.text) || countryPattern.test(line.text);
  });
  return candidate ? value(candidate.text, candidate.lineNumber, countryPattern.test(candidate.text) ? "high" : "medium") : null;
}

function linkKind(url: string): ResumeLink["kind"] {
  if (/linkedin\.com/i.test(url)) return "linkedin";
  if (/github\.com/i.test(url)) return "github";
  if (/\.(?:com|net|org|io|in|dev|me)\//i.test(url)) return "portfolio";
  return "other";
}

function extractContact(headerLines: ResumeLine[]) {
  const contentLines = headerLines.filter((line) => !line.isBlank).slice(0, 12);
  const emails = uniqueValues(contentLines.flatMap((line) => [...line.text.matchAll(EMAIL_PATTERN)].map((match) => value(match[0], line.lineNumber, "high"))));
  EMAIL_PATTERN.lastIndex = 0;
  const phones = uniqueValues(contentLines.flatMap((line) => [...line.text.matchAll(PHONE_PATTERN)]
    .map((match) => match[0].trim())
    .filter((phone) => phone.replace(/\D/g, "").length >= 8 && phone.replace(/\D/g, "").length <= 15)
    .map((phone) => value(phone, line.lineNumber, "high"))));
  PHONE_PATTERN.lastIndex = 0;
  const links = contentLines.flatMap((line) => [...line.text.matchAll(URL_PATTERN)].map((match) => ({ ...value(match[0], line.lineNumber, "high"), kind: linkKind(match[0]) })));
  URL_PATTERN.lastIndex = 0;
  const nameLine = contentLines.slice(0, 5).find(looksLikeName);
  const name = nameLine ? value(nameLine.text, nameLine.lineNumber, nameLine === contentLines[0] ? "high" : "medium") : null;
  const ignoredLines = new Set([name?.sourceLine, ...emails.map((item) => item.sourceLine), ...phones.map((item) => item.sourceLine), ...links.map((item) => item.sourceLine)].filter((item): item is number => typeof item === "number"));
  return { name, emails, phones, location: findLocation(contentLines, ignoredLines), links };
}

function extractSummary(lines: ResumeLine[]) {
  const content = lines.filter((line) => !line.isBlank && !line.isBullet);
  if (!content.length) return null;
  const text = content.map((line) => line.content).join(" ").replace(/\s+/g, " ").trim().slice(0, 2_000);
  return { text, sourceLines: content.map((line) => line.lineNumber), confidence: confidenceForScore(text.length >= 60 ? 0.95 : 0.65) } as const;
}

function extractSkills(lines: ResumeLine[]) {
  const skills = lines.filter((line) => !line.isBlank).flatMap((line) => {
    const cleaned = line.content.replace(/^(?:technical|professional|core|key)\s+(?:skills|competencies)\s*:\s*/i, "");
    return cleaned.split(/[,;|•▪◦●]+/).map((item) => item.trim()).filter((item) => item.length >= 2 && item.length <= 80 && (item.match(/[\p{L}\p{N}+#.-]+/gu) ?? []).length <= 8)
      .map((item) => value(item, line.lineNumber, /[,;|•▪◦●]/.test(cleaned) || line.isBullet ? "high" : "medium"));
  });
  return uniqueValues(skills).slice(0, 100);
}

function dateValue(text: string, line: number) {
  const match = text.match(DATE_RANGE_PATTERN) ?? text.match(SINGLE_DATE_PATTERN);
  return match ? value(match[0], line, DATE_RANGE_PATTERN.test(match[0]) ? "high" : "medium") : null;
}

function parseExperienceHeader(lines: ResumeLine[]) {
  const joined = lines.map((line) => line.content).join(" | ");
  const sourceLine = lines[0]?.lineNumber ?? 0;
  const dateRange = lines.map((line) => dateValue(line.content, line.lineNumber)).find(Boolean) ?? null;
  const withoutDate = joined.replace(DATE_RANGE_PATTERN, "").replace(/\s*[|,;–—-]+\s*$/, "").trim();
  const parts = withoutDate.split(/\s*(?:\||@|\s[–—-]\s)\s*/).flatMap((part) => {
    if (part.includes(",") && part.split(",").length === 2) return part.split(",").map((item) => item.trim());
    return [part.trim()];
  }).filter(Boolean);
  const roleIndex = parts.findIndex((part) => ROLE_PATTERN.test(part));
  const titleText = roleIndex >= 0 ? parts[roleIndex] : parts[0];
  const organizationText = parts.find((_, index) => index !== (roleIndex >= 0 ? roleIndex : 0));
  const locationText = parts.find((part, index) => index > 1 && /,/.test(part));
  return {
    title: titleText ? value(titleText, lines.find((line) => line.content.includes(titleText))?.lineNumber ?? sourceLine, roleIndex >= 0 ? "high" : "medium") : null,
    organization: organizationText ? value(organizationText, lines.find((line) => line.content.includes(organizationText))?.lineNumber ?? sourceLine, roleIndex >= 0 ? "medium" : "low") : null,
    location: locationText ? value(locationText, sourceLine, "low") : null,
    dateRange,
  };
}

function extractExperience(lines: ResumeLine[], bulletByLine: Map<number, ResumeBullet>) {
  const entries: ExperienceEntry[] = [];
  const pendingHeaders: ResumeLine[] = [];
  let current: ExperienceEntry | null = null;

  const startEntry = (headers: ResumeLine[]) => {
    const parsed = parseExperienceHeader(headers);
    return { ...parsed, details: [], bullets: [], sourceLines: headers.map((line) => line.lineNumber) } satisfies ExperienceEntry;
  };
  const finishCurrent = () => {
    if (current && (current.title || current.organization || current.details.length || current.bullets.length)) entries.push(current);
    current = null;
  };

  for (const line of lines) {
    if (line.isBlank) continue;
    if (line.isBullet) {
      if (!current) current = startEntry(pendingHeaders.splice(0));
      const bullet = bulletByLine.get(line.lineNumber);
      if (bullet) current.bullets.push(bullet);
      current.sourceLines.push(line.lineNumber);
      continue;
    }
    const hasDate = Boolean(dateValue(line.content, line.lineNumber));
    if (hasDate) {
      if (current?.bullets.length) finishCurrent();
      const headers = [...pendingHeaders.splice(0), line];
      if (current && !current.bullets.length) finishCurrent();
      current = startEntry(headers);
      continue;
    }
    if (current) {
      if (current.bullets.length) {
        finishCurrent();
        pendingHeaders.push(line);
      } else {
        current.details.push(value(line.content, line.lineNumber, "medium"));
        current.sourceLines.push(line.lineNumber);
      }
    } else {
      pendingHeaders.push(line);
      if (pendingHeaders.length >= 2 && ROLE_PATTERN.test(pendingHeaders.map((item) => item.content).join(" "))) {
        current = startEntry(pendingHeaders.splice(0));
      }
    }
  }
  if (!current && pendingHeaders.length) current = startEntry(pendingHeaders);
  finishCurrent();
  return entries.slice(0, 30);
}

function extractEducation(lines: ResumeLine[]) {
  const entries: EducationEntry[] = [];
  let current: EducationEntry | null = null;
  const emptyEntry = (): EducationEntry => ({ qualification: null, institution: null, dateRange: null, details: [], sourceLines: [] });
  const finish = () => {
    if (current && (current.qualification || current.institution || current.details.length)) entries.push(current);
    current = null;
  };

  for (const line of lines.filter((item) => !item.isBlank)) {
    const text = line.content;
    const date = dateValue(text, line.lineNumber);
    if (DEGREE_PATTERN.test(text)) {
      const previousEntry = current as EducationEntry | null;
      if (previousEntry?.qualification) finish();
      const entry: EducationEntry = current ?? emptyEntry();
      current = entry;
      const parts = text.split(/\s*[,|]\s*/, 2);
      entry.qualification = value(parts[0], line.lineNumber, "high");
      if (parts[1] && INSTITUTION_PATTERN.test(parts[1])) entry.institution = value(parts[1], line.lineNumber, "high");
      if (date) entry.dateRange = date;
      entry.sourceLines.push(line.lineNumber);
    } else if (INSTITUTION_PATTERN.test(text)) {
      let entry: EducationEntry = current ?? emptyEntry();
      current = entry;
      if (entry.institution) finish();
      entry = current ?? emptyEntry();
      current = entry;
      entry.institution = value(text.replace(DATE_RANGE_PATTERN, "").trim(), line.lineNumber, "high");
      if (date) entry.dateRange = date;
      entry.sourceLines.push(line.lineNumber);
    } else {
      const entry: EducationEntry = current ?? emptyEntry();
      current = entry;
      if (date && !entry.dateRange) entry.dateRange = date;
      else entry.details.push(value(text, line.lineNumber, "medium"));
      entry.sourceLines.push(line.lineNumber);
    }
  }
  finish();
  return entries.slice(0, 20);
}

function extractCertifications(lines: ResumeLine[]) {
  return lines.filter((line) => !line.isBlank).slice(0, 30).map((line) => {
    const date = dateValue(line.content, line.lineNumber);
    const withoutDate = line.content.replace(DATE_RANGE_PATTERN, "").replace(SINGLE_DATE_PATTERN, "").replace(/\s*[|,;–—-]+\s*$/, "").trim();
    const parts = withoutDate.split(/\s*(?:\||\s[–—-]\s)\s*/, 2).filter(Boolean);
    return {
      name: value(parts[0] || line.content, line.lineNumber, "high"),
      issuer: parts[1] ? value(parts[1], line.lineNumber, "medium") : null,
      date,
      sourceLine: line.lineNumber,
    } satisfies CertificationEntry;
  });
}

export function extractStructuredResume(resumeText: string): StructuredResume {
  const lines = buildLines(resumeText);
  const { blocks, sections, headingLines } = partitionSections(lines);
  const lineSection = new Map<number, StructuredSectionName>();
  for (const [section, blockLines] of blocks) for (const line of blockLines) lineSection.set(line.lineNumber, section);
  const bullets = lines.filter((line) => line.isBullet && line.content).slice(0, 300).map((line) => ({
    id: `bullet-${line.lineNumber}`,
    text: line.content,
    sourceLine: line.lineNumber,
    section: lineSection.get(line.lineNumber) ?? "other",
  } satisfies ResumeBullet));
  const bulletByLine = new Map(bullets.map((bullet) => [bullet.sourceLine, bullet]));
  const contact = extractContact(blocks.get("header") ?? []);
  const summary = extractSummary(blocks.get("summary") ?? []);
  const skills = extractSkills(blocks.get("skills") ?? []);
  const experience = extractExperience(blocks.get("experience") ?? [], bulletByLine);
  const education = extractEducation(blocks.get("education") ?? []);
  const certifications = extractCertifications(blocks.get("certifications") ?? []);
  const warnings = [
    !contact.name && "Candidate name was not confidently identified.",
    !contact.emails.length && "No email address was identified.",
    !contact.phones.length && "No phone number was identified.",
    !summary && "No standard summary section was identified.",
    !skills.length && "No structured skills section was identified.",
    !experience.length && "No structured experience entries were identified.",
    !education.length && "No structured education entries were identified.",
  ].filter(Boolean) as string[];
  const confidence = Math.round(
    (contact.name ? 10 : 0) + (contact.emails.length ? 10 : 0) + (contact.phones.length ? 8 : 0)
    + (summary ? 10 : 0) + (skills.length ? 12 : 0) + (experience.length ? 25 : 0)
    + (education.length ? 15 : 0) + (bullets.length ? 10 : 0),
  );
  const classifiedLines = new Set<number>([
    ...headingLines,
    ...sections.flatMap((section) => lines.filter((line) => line.lineNumber >= section.startLine && line.lineNumber <= section.endLine && !line.isBlank).map((line) => line.lineNumber)),
    ...[contact.name, ...contact.emails, ...contact.phones, contact.location, ...contact.links].filter(Boolean).map((item) => item!.sourceLine),
  ]);

  return {
    schemaVersion: 1,
    contact,
    summary,
    skills,
    experience,
    education,
    certifications,
    bullets,
    sections,
    extraction: {
      confidence,
      warnings,
      unclassifiedLines: lines.filter((line) => !line.isBlank && !classifiedLines.has(line.lineNumber)).map((line) => line.lineNumber),
    },
  };
}

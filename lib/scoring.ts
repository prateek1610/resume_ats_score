export type AnalysisMode = "standalone" | "job_match";

export type Recommendation = {
  id: string;
  category: "keywords" | "structure" | "impact" | "essentials";
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export type ResumeAnalysis = {
  mode: AnalysisMode;
  overallScore: number;
  keywordScore: number;
  structureScore: number;
  impactScore: number;
  essentialsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  recommendations: Recommendation[];
  sections: Array<{ name: string; present: boolean }>;
  stats: {
    wordCount: number;
    bulletCount: number;
    metricCount: number;
    actionVerbCount: number;
    sectionCount: number;
  };
};

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "been", "being", "but", "can",
  "candidate", "company", "could", "each", "from", "have", "into", "job",
  "more", "must", "our", "role", "should", "that", "the", "their", "then",
  "these", "they", "this", "through", "using", "was", "were", "what", "when",
  "where", "which", "while", "will", "with", "work", "you", "your", "years",
  "preferred", "required", "responsibilities", "requirements", "including",
  "has", "hiring", "ideal",
]);

const ACTION_VERBS = [
  "achieved", "accelerated", "built", "created", "delivered", "designed",
  "developed", "drove", "executed", "generated", "grew", "implemented",
  "improved", "increased", "launched", "led", "managed", "optimized",
  "reduced", "resolved", "saved", "scaled", "streamlined", "trained",
];

const COMMON_SKILLS = [
  "account management", "agile", "aws", "business analysis", "communication",
  "customer service", "data analysis", "excel", "figma", "git", "javascript",
  "leadership", "machine learning", "node.js", "power bi", "product management",
  "project management", "python", "react", "salesforce", "sql", "tableau",
  "typescript", "user research",
];

const SECTION_PATTERNS = [
  { name: "Summary", pattern: /(?:^|\n)\s*(?:professional\s+)?(?:summary|profile|objective)\s*[:\n]/i },
  { name: "Experience", pattern: /(?:^|\n)\s*(?:work\s+|professional\s+)?experience\s*[:\n]/i },
  { name: "Education", pattern: /(?:^|\n)\s*(?:education|academic background)\s*[:\n]/i },
  { name: "Skills", pattern: /(?:^|\n)\s*(?:technical\s+|core\s+)?skills\s*[:\n]/i },
  { name: "Projects", pattern: /(?:^|\n)\s*(?:projects|selected projects)\s*[:\n]/i },
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function occurrences(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

function extractKeywords(jobDescription: string) {
  const normalized = jobDescription.toLowerCase();
  const frequencies = new Map<string, number>();
  const tokens = normalized.match(/[a-z][a-z0-9+#-]{2,}/g) ?? [];

  for (const token of tokens) {
    if (STOP_WORDS.has(token) || /^\d+$/.test(token)) continue;
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  for (const skill of COMMON_SKILLS) {
    if (normalized.includes(skill)) frequencies.set(skill, (frequencies.get(skill) ?? 0) + 3);
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([term]) => term)
    .filter((term, index, all) => !all.some((other, otherIndex) => otherIndex < index && other.includes(term)))
    .slice(0, 24);
}

export function analyzeResume(resumeText: string, jobDescription = ""): ResumeAnalysis {
  const cleanResume = resumeText.replace(/\r/g, "").trim();
  const lower = cleanResume.toLowerCase();
  const mode: AnalysisMode = jobDescription.trim() ? "job_match" : "standalone";
  const words = cleanResume.match(/[\p{L}\p{N}][\p{L}\p{N}'+.-]*/gu) ?? [];
  const bulletCount = occurrences(cleanResume, /(?:^|\n)\s*(?:[-•▪◦*]|\d+[.)])\s+/gm);
  const metricCount = occurrences(cleanResume, /\b\d+(?:\.\d+)?(?:\s?%|\+|x|k|m|million|thousand)?\b/gi);
  const actionVerbCount = ACTION_VERBS.reduce(
    (total, verb) => total + occurrences(lower, new RegExp(`\\b${verb}\\b`, "g")),
    0,
  );
  const sections = SECTION_PATTERNS.map(({ name, pattern }) => ({ name, present: pattern.test(cleanResume) }));
  const sectionCount = sections.filter((section) => section.present).length;
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(cleanResume);
  const hasPhone = /(?:\+?\d[\s().-]*){8,15}/.test(cleanResume);
  const hasLinkedIn = /linkedin\.com\/(?:in|pub)\//i.test(cleanResume);

  const targetKeywords = mode === "job_match" ? extractKeywords(jobDescription) : COMMON_SKILLS;
  const matchedKeywords = targetKeywords.filter((term) => lower.includes(term));
  const missingKeywords = mode === "job_match"
    ? targetKeywords.filter((term) => !lower.includes(term)).slice(0, 12)
    : [];

  const keywordScore = mode === "job_match"
    ? clamp((matchedKeywords.length / Math.max(targetKeywords.length, 1)) * 100)
    : clamp(35 + matchedKeywords.length * 7 + (sections.find((section) => section.name === "Skills")?.present ? 20 : 0));

  let structurePoints = 0;
  structurePoints += Math.min(sectionCount * 12, 60);
  structurePoints += hasEmail ? 10 : 0;
  structurePoints += hasPhone ? 10 : 0;
  structurePoints += bulletCount >= 4 ? 10 : bulletCount * 2;
  structurePoints += words.length >= 250 && words.length <= 900 ? 10 : words.length >= 150 ? 5 : 0;
  const structureScore = clamp(structurePoints);

  const impactScore = clamp(
    20 + Math.min(actionVerbCount * 6, 36) + Math.min(metricCount * 5, 30) + Math.min(bulletCount, 14),
  );

  let essentialPoints = 0;
  essentialPoints += hasEmail ? 15 : 0;
  essentialPoints += hasPhone ? 15 : 0;
  essentialPoints += hasLinkedIn ? 5 : 0;
  essentialPoints += sections.find((section) => section.name === "Experience")?.present ? 20 : 0;
  essentialPoints += sections.find((section) => section.name === "Education")?.present ? 15 : 0;
  essentialPoints += sections.find((section) => section.name === "Skills")?.present ? 20 : 0;
  essentialPoints += words.length >= 180 ? 10 : 0;
  const essentialsScore = clamp(essentialPoints);

  const overallScore = clamp(
    mode === "job_match"
      ? keywordScore * 0.4 + structureScore * 0.25 + impactScore * 0.2 + essentialsScore * 0.15
      : keywordScore * 0.25 + structureScore * 0.3 + impactScore * 0.25 + essentialsScore * 0.2,
  );

  const recommendations: Recommendation[] = [];
  if (mode === "job_match" && missingKeywords.length) {
    recommendations.push({
      id: "missing-keywords",
      category: "keywords",
      priority: keywordScore < 55 ? "high" : "medium",
      title: "Close the keyword gap",
      detail: `Add relevant evidence for: ${missingKeywords.slice(0, 6).join(", ")}. Use only skills you genuinely have.`,
    });
  }
  const missingSections = sections.filter((section) => !section.present && section.name !== "Projects").map((section) => section.name);
  if (missingSections.length) {
    recommendations.push({
      id: "missing-sections",
      category: "structure",
      priority: "high",
      title: "Add standard ATS sections",
      detail: `Use clear headings for ${missingSections.join(", ")}. Avoid creative labels that parsing systems may miss.`,
    });
  }
  if (!hasEmail || !hasPhone) {
    recommendations.push({
      id: "contact-details",
      category: "essentials",
      priority: "high",
      title: "Complete your contact block",
      detail: `Add ${[!hasEmail && "an email address", !hasPhone && "a phone number"].filter(Boolean).join(" and ")} near the top of the resume.`,
    });
  }
  if (metricCount < 3) {
    recommendations.push({
      id: "quantify-impact",
      category: "impact",
      priority: "medium",
      title: "Quantify more achievements",
      detail: "Add numbers to show scale, speed, revenue, savings, volume, quality, or customer outcomes.",
    });
  }
  if (actionVerbCount < 4) {
    recommendations.push({
      id: "action-verbs",
      category: "impact",
      priority: "medium",
      title: "Lead bullets with action verbs",
      detail: "Start accomplishment bullets with specific verbs such as delivered, improved, resolved, or launched.",
    });
  }
  if (words.length < 180 || words.length > 1000) {
    recommendations.push({
      id: "resume-length",
      category: "structure",
      priority: "low",
      title: words.length < 180 ? "Add enough role evidence" : "Tighten the resume",
      detail: words.length < 180
        ? "Include concise achievements and responsibilities for your most relevant roles."
        : "Remove repetition and older low-value details so important evidence is easier to scan.",
    });
  }
  if (bulletCount < 4) {
    recommendations.push({
      id: "scannable-bullets",
      category: "structure",
      priority: "low",
      title: "Make experience easier to scan",
      detail: "Use short bullet points for achievements instead of dense paragraphs.",
    });
  }

  const strengths: string[] = [];
  if (sectionCount >= 4) strengths.push("Clear, recognizable resume sections");
  if (metricCount >= 3) strengths.push("Achievements include measurable evidence");
  if (actionVerbCount >= 4) strengths.push("Strong action-led language");
  if (hasEmail && hasPhone) strengths.push("Complete recruiter contact information");
  if (mode === "job_match" && keywordScore >= 65) strengths.push("Good alignment with the target role");
  if (!strengths.length) strengths.push("A usable foundation with clear opportunities to improve");

  return {
    mode,
    overallScore,
    keywordScore,
    structureScore,
    impactScore,
    essentialsScore,
    matchedKeywords: matchedKeywords.slice(0, 16),
    missingKeywords,
    strengths,
    recommendations: recommendations.slice(0, 6),
    sections,
    stats: { wordCount: words.length, bulletCount, metricCount, actionVerbCount, sectionCount },
  };
}

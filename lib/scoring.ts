export type AnalysisMode = "standalone" | "job_match";

export type Recommendation = {
  id: string;
  category: "keywords" | "structure" | "impact" | "essentials" | "language";
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  why?: string;
  example?: string;
};

export type SectionInsight = {
  name: string;
  present: boolean;
  score: number;
  status: "strong" | "improve" | "missing";
  feedback: string;
  checks: string[];
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
  sections: SectionInsight[];
  stats: {
    wordCount: number;
    bulletCount: number;
    metricCount: number;
    actionVerbCount: number;
    sectionCount: number;
    weakPhraseCount: number;
    firstPersonCount: number;
    longBulletCount: number;
  };
};

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "been", "being", "but", "can",
  "candidate", "company", "could", "each", "from", "have", "into", "job",
  "more", "must", "our", "role", "should", "that", "the", "their", "then",
  "these", "they", "this", "through", "using", "was", "were", "what", "when",
  "where", "which", "while", "will", "with", "work", "you", "your", "years",
  "preferred", "required", "responsibilities", "requirements", "including",
  "has", "hiring", "ideal", "team", "skills", "experience", "ability",
]);

const ACTION_VERBS = [
  "achieved", "accelerated", "built", "created", "delivered", "designed",
  "developed", "drove", "executed", "generated", "grew", "implemented",
  "improved", "increased", "launched", "led", "managed", "optimized",
  "reduced", "resolved", "saved", "scaled", "streamlined", "trained",
  "coordinated", "analyzed", "automated", "negotiated", "mentored", "owned",
  "planned", "produced", "supported", "transformed", "won", "exceeded",
];

const WEAK_PHRASES = [
  "responsible for", "helped with", "worked on", "duties included", "tasked with",
  "participated in", "assisted with", "involved in", "hard working", "team player",
];

const COMMON_SKILLS = [
  "account management", "agile", "aws", "business analysis", "communication",
  "customer service", "data analysis", "excel", "figma", "git", "javascript",
  "leadership", "machine learning", "node.js", "power bi", "product management",
  "project management", "python", "react", "salesforce", "sql", "tableau",
  "typescript", "user research", "troubleshooting", "ticketing", "service desk",
];

const SECTION_DEFINITIONS = [
  { name: "Summary", pattern: /^(?:professional\s+)?(?:summary|profile|objective)$/i },
  { name: "Experience", pattern: /^(?:work\s+|professional\s+)?experience$/i },
  { name: "Education", pattern: /^(?:education|academic background|qualifications)$/i },
  { name: "Skills", pattern: /^(?:technical\s+|core\s+)?skills$/i },
  { name: "Projects", pattern: /^(?:projects|selected projects|key projects)$/i },
] as const;

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

function getSectionBlocks(text: string) {
  const lines = text.split("\n");
  const headings = lines.flatMap((line, index) => {
    const normalized = line.trim().replace(/:$/, "");
    const definition = SECTION_DEFINITIONS.find((item) => item.pattern.test(normalized));
    return definition ? [{ name: definition.name, index }] : [];
  });
  const blocks = new Map<string, string>();
  headings.forEach((heading, index) => {
    const end = headings[index + 1]?.index ?? lines.length;
    blocks.set(heading.name, lines.slice(heading.index + 1, end).join("\n").trim());
  });
  return blocks;
}

function statusFor(score: number, present: boolean): SectionInsight["status"] {
  if (!present) return "missing";
  return score >= 75 ? "strong" : "improve";
}

export function analyzeResume(resumeText: string, jobDescription = ""): ResumeAnalysis {
  const cleanResume = resumeText.replace(/\r/g, "").trim();
  const lower = cleanResume.toLowerCase();
  const mode: AnalysisMode = jobDescription.trim() ? "job_match" : "standalone";
  const words = cleanResume.match(/[\p{L}\p{N}][\p{L}\p{N}'+.-]*/gu) ?? [];
  const bullets = cleanResume.split("\n").filter((line) => /^\s*(?:[-•▪◦*]|\d+[.)])\s+/.test(line));
  const bulletCount = bullets.length;
  const resumeWithoutContactNumbers = cleanResume
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, " ")
    .replace(/(?:\+?\d[\s().-]*){8,15}/g, " ");
  const metricTokens = resumeWithoutContactNumbers.match(/\b\d+(?:\.\d+)?(?:\s?%|\+|x|k|m|million|thousand)?\b/gi) ?? [];
  const metricCount = metricTokens.filter((token) => {
    const number = Number.parseInt(token, 10);
    return number < 1900 || number > 2099 || /[%+xkm]|million|thousand/i.test(token);
  }).length;
  const actionVerbCount = ACTION_VERBS.reduce(
    (total, verb) => total + occurrences(lower, new RegExp(`\\b${verb}\\b`, "g")),
    0,
  );
  const weakPhraseCount = WEAK_PHRASES.reduce(
    (total, phrase) => total + occurrences(lower, new RegExp(`\\b${phrase.replace(/ /g, "\\s+")}\\b`, "g")),
    0,
  );
  const firstPersonCount = occurrences(lower, /\b(?:i|me|my|mine|we|our|ours)\b/g);
  const longBulletCount = bullets.filter((bullet) => (bullet.match(/[\p{L}\p{N}][\p{L}\p{N}'+.-]*/gu) ?? []).length > 32).length;
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(cleanResume);
  const hasPhone = /(?:\+?\d[\s().-]*){8,15}/.test(cleanResume);
  const hasLinkedIn = /linkedin\.com\/(?:in|pub)\//i.test(cleanResume);
  const sectionBlocks = getSectionBlocks(cleanResume);
  const sectionCount = SECTION_DEFINITIONS.filter((section) => sectionBlocks.has(section.name)).length;

  const targetKeywords = mode === "job_match" ? extractKeywords(jobDescription) : COMMON_SKILLS;
  const matchedKeywords = targetKeywords.filter((term) => lower.includes(term));
  const missingKeywords = mode === "job_match"
    ? targetKeywords.filter((term) => !lower.includes(term)).slice(0, 12)
    : [];
  const keywordCoverage = matchedKeywords.length / Math.max(targetKeywords.length, 1);

  const keywordScore = mode === "job_match"
    ? clamp(keywordCoverage * 100)
    : clamp(35 + matchedKeywords.length * 7 + (sectionBlocks.has("Skills") ? 20 : 0));

  let structurePoints = 0;
  structurePoints += Math.min(sectionCount * 12, 60);
  structurePoints += hasEmail ? 8 : 0;
  structurePoints += hasPhone ? 8 : 0;
  structurePoints += bulletCount >= 4 ? 12 : bulletCount * 2;
  structurePoints += words.length >= 250 && words.length <= 900 ? 12 : words.length >= 150 ? 6 : 0;
  structurePoints -= longBulletCount * 2;
  const structureScore = clamp(structurePoints);

  const impactScore = clamp(
    18 + Math.min(actionVerbCount * 5, 35) + Math.min(metricCount * 5, 30)
      + Math.min(bulletCount, 12) - weakPhraseCount * 5 - firstPersonCount * 2,
  );

  let essentialPoints = 0;
  essentialPoints += hasEmail ? 15 : 0;
  essentialPoints += hasPhone ? 15 : 0;
  essentialPoints += hasLinkedIn ? 5 : 0;
  essentialPoints += sectionBlocks.has("Experience") ? 20 : 0;
  essentialPoints += sectionBlocks.has("Education") ? 15 : 0;
  essentialPoints += sectionBlocks.has("Skills") ? 20 : 0;
  essentialPoints += words.length >= 180 ? 10 : 0;
  const essentialsScore = clamp(essentialPoints);

  const overallScore = clamp(
    mode === "job_match"
      ? keywordScore * 0.4 + structureScore * 0.25 + impactScore * 0.2 + essentialsScore * 0.15
      : keywordScore * 0.25 + structureScore * 0.3 + impactScore * 0.25 + essentialsScore * 0.2,
  );

  const summaryWords = (sectionBlocks.get("Summary")?.match(/[\p{L}\p{N}][\p{L}\p{N}'+.-]*/gu) ?? []).length;
  const summaryScore = !sectionBlocks.has("Summary") ? 0 : clamp(
    45 + (summaryWords >= 30 && summaryWords <= 110 ? 25 : 5) + (mode === "job_match" && matchedKeywords.length >= 2 ? 20 : 10),
  );
  const experienceScore = !sectionBlocks.has("Experience") ? 0 : clamp(
    35 + Math.min(bulletCount * 5, 25) + Math.min(metricCount * 7, 28) + Math.min(actionVerbCount * 3, 12),
  );
  const skillsScore = !sectionBlocks.has("Skills") ? 0 : clamp(
    50 + Math.min(matchedKeywords.length * 6, 36) + (mode === "standalone" ? 10 : 0),
  );

  const sections: SectionInsight[] = [
    {
      name: "Contact",
      present: hasEmail || hasPhone,
      score: clamp((hasEmail ? 45 : 0) + (hasPhone ? 40 : 0) + (hasLinkedIn ? 15 : 0)),
      status: statusFor((hasEmail ? 45 : 0) + (hasPhone ? 40 : 0) + (hasLinkedIn ? 15 : 0), hasEmail || hasPhone),
      feedback: hasEmail && hasPhone
        ? `Recruiters can reach you easily${hasLinkedIn ? ", and your LinkedIn profile adds credibility" : "; adding LinkedIn would make the header more complete"}.`
        : "Your header is missing a reliable recruiter contact method.",
      checks: [hasEmail ? "Email detected" : "Email missing", hasPhone ? "Phone detected" : "Phone missing", hasLinkedIn ? "LinkedIn detected" : "LinkedIn not found"],
    },
    {
      name: "Summary",
      present: sectionBlocks.has("Summary"),
      score: summaryScore,
      status: statusFor(summaryScore, sectionBlocks.has("Summary")),
      feedback: !sectionBlocks.has("Summary")
        ? "Add a concise 3–4 line profile tailored to the target role."
        : summaryWords >= 30 && summaryWords <= 110
          ? `Your ${summaryWords}-word summary is concise and easy to scan.`
          : `Your summary is ${summaryWords < 30 ? "too brief to establish value" : "longer than most recruiters will scan"}.`,
      checks: [`${summaryWords} words`, mode === "job_match" ? `${matchedKeywords.length} target terms found across resume` : "Standalone review"],
    },
    {
      name: "Experience",
      present: sectionBlocks.has("Experience"),
      score: experienceScore,
      status: statusFor(experienceScore, sectionBlocks.has("Experience")),
      feedback: !sectionBlocks.has("Experience")
        ? "Use a standard Experience heading so ATS software can identify your employment history."
        : metricCount >= 3 && actionVerbCount >= 4
          ? "Your experience shows ownership and measurable outcomes."
          : "Your experience is readable, but more quantified, action-led achievements would make it persuasive.",
      checks: [`${bulletCount} bullets`, `${metricCount} measurable results`, `${actionVerbCount} action verbs`],
    },
    {
      name: "Skills",
      present: sectionBlocks.has("Skills"),
      score: skillsScore,
      status: statusFor(skillsScore, sectionBlocks.has("Skills")),
      feedback: !sectionBlocks.has("Skills")
        ? "Add a clearly labelled Skills section with role-relevant tools and capabilities."
        : mode === "job_match"
          ? `${matchedKeywords.length} target terms are supported; add missing terms only where you have genuine experience.`
          : "Your skills are clearly separated for quick ATS scanning.",
      checks: [mode === "job_match" ? `${Math.round(keywordCoverage * 100)}% keyword coverage` : `${matchedKeywords.length} recognized skills`, `${missingKeywords.length} priority gaps`],
    },
    {
      name: "Education",
      present: sectionBlocks.has("Education"),
      score: sectionBlocks.has("Education") ? 88 : 0,
      status: statusFor(sectionBlocks.has("Education") ? 88 : 0, sectionBlocks.has("Education")),
      feedback: sectionBlocks.has("Education")
        ? "A standard Education heading makes qualifications easy to identify."
        : "Add your degree, institution and completion year under an Education heading.",
      checks: [sectionBlocks.has("Education") ? "ATS heading recognized" : "Section not detected"],
    },
  ];

  const recommendations: Recommendation[] = [];
  if (mode === "job_match" && missingKeywords.length) {
    recommendations.push({
      id: "missing-keywords", category: "keywords", priority: keywordScore < 55 ? "high" : "medium",
      title: "Close the highest-value keyword gaps",
      detail: `Build truthful evidence around: ${missingKeywords.slice(0, 6).join(", ")}. Do not simply paste a keyword list.`,
      why: "Most ATS tools rank resumes partly by role-specific language and context.",
      example: `Instead of “Used tools for reporting,” write “Built weekly ${missingKeywords[0] ?? "role-specific"} reports that improved decision speed.”`,
    });
  }
  const missingSections = ["Summary", "Experience", "Education", "Skills"].filter((name) => !sectionBlocks.has(name));
  if (missingSections.length) {
    recommendations.push({
      id: "missing-sections", category: "structure", priority: "high", title: "Restore standard ATS sections",
      detail: `Add clear headings for ${missingSections.join(", ")}. Keep headings simple and left-aligned.`,
      why: "Non-standard labels can cause ATS parsers to place content in the wrong field.",
      example: "Use “Professional Experience” instead of a creative label such as “My Journey.”",
    });
  }
  if (!hasEmail || !hasPhone) {
    recommendations.push({
      id: "contact-details", category: "essentials", priority: "high", title: "Complete the contact header",
      detail: `Add ${[!hasEmail && "an email address", !hasPhone && "a phone number"].filter(Boolean).join(" and ")} near your name.`,
      why: "A strong score is irrelevant if a recruiter cannot contact you.",
      example: "Name · City · +91 98XXXXXX · name@email.com · linkedin.com/in/name",
    });
  }
  if (metricCount < 3) {
    recommendations.push({
      id: "quantify-impact", category: "impact", priority: "high", title: "Turn duties into measurable outcomes",
      detail: "Add numbers showing volume, time saved, quality, revenue, cost, team size or customer outcomes.",
      why: "Metrics prove scale and help recruiters compare your contribution quickly.",
      example: "Changed “Handled customer queries” to “Resolved 35+ daily tickets while maintaining 94% CSAT.”",
    });
  }
  if (actionVerbCount < 4) {
    recommendations.push({
      id: "action-verbs", category: "impact", priority: "medium", title: "Open bullets with decisive verbs",
      detail: "Lead each achievement with a specific verb such as resolved, improved, delivered, analyzed or trained.",
      why: "Action-led writing makes ownership and contribution immediately visible.",
      example: "“Improved first-response time by 22% by introducing ticket triage rules.”",
    });
  }
  if (weakPhraseCount) {
    recommendations.push({
      id: "weak-language", category: "language", priority: "medium", title: "Replace passive responsibility language",
      detail: `${weakPhraseCount} weak phrase${weakPhraseCount === 1 ? " was" : "s were"} detected. Replace “responsible for” or “helped with” with ownership and outcome.`,
      why: "Generic duty statements sound interchangeable and hide your individual contribution.",
      example: "Replace “Responsible for reports” with “Produced weekly performance reports for 4 department leads.”",
    });
  }
  if (firstPersonCount) {
    recommendations.push({
      id: "first-person", category: "language", priority: "low", title: "Remove first-person pronouns",
      detail: `Remove ${firstPersonCount} use${firstPersonCount === 1 ? "" : "s"} of I, my, we or our and start directly with the action.`,
      why: "Resume convention omits pronouns, saving space and creating a sharper tone.",
      example: "Change “I managed onboarding” to “Managed onboarding for 18 new hires.”",
    });
  }
  if (longBulletCount) {
    recommendations.push({
      id: "long-bullets", category: "structure", priority: "medium", title: "Shorten dense bullets",
      detail: `${longBulletCount} bullet${longBulletCount === 1 ? " is" : "s are"} longer than 32 words. Keep one achievement and one outcome per bullet.`,
      why: "Dense bullets are harder for recruiters to scan in a 10-second first pass.",
      example: "Aim for 12–28 words: action + task + measurable result.",
    });
  }
  if (words.length < 180 || words.length > 1000) {
    recommendations.push({
      id: "resume-length", category: "structure", priority: "medium",
      title: words.length < 180 ? "Add enough role evidence" : "Tighten low-value detail",
      detail: words.length < 180
        ? "Include concise achievements and responsibilities for your most relevant roles."
        : "Remove repetition and older low-value detail so the strongest evidence is easier to find.",
      why: `${words.length} words is ${words.length < 180 ? "too little for a credible professional history" : "likely to dilute your strongest evidence"}.`,
      example: "Prioritize the last 10–15 years and keep each recent role to 3–6 high-value bullets.",
    });
  }
  if (bulletCount < 4) {
    recommendations.push({
      id: "scannable-bullets", category: "structure", priority: "low", title: "Make experience easier to scan",
      detail: "Use short bullets for achievements instead of dense paragraphs.",
      why: "Bullets help ATS extraction and recruiter scanning when used consistently.",
      example: "Use 3–6 bullets per recent role, ordered from most relevant to least relevant.",
    });
  }

  const strengths: string[] = [];
  if (sectionCount >= 4) strengths.push(`${sectionCount} standard sections are clearly recognized by ATS parsers.`);
  if (metricCount >= 3) strengths.push(`${metricCount} measurable results give your achievements credibility and scale.`);
  if (actionVerbCount >= 4) strengths.push(`${actionVerbCount} action verbs create a confident, ownership-focused tone.`);
  if (hasEmail && hasPhone) strengths.push(`Your contact header includes both email and phone details.`);
  if (words.length >= 250 && words.length <= 900) strengths.push(`${words.length} words keeps the resume detailed without becoming difficult to scan.`);
  if (mode === "job_match" && keywordScore >= 65) strengths.push(`${keywordScore}% keyword alignment shows good relevance to the target role.`);
  if (bulletCount >= 4 && longBulletCount === 0) strengths.push(`Your ${bulletCount} experience bullets are concise and recruiter-friendly.`);
  if (!strengths.length) strengths.push("Your resume has a usable foundation; the priority actions below will make the biggest difference.");

  return {
    mode,
    overallScore,
    keywordScore,
    structureScore,
    impactScore,
    essentialsScore,
    matchedKeywords: matchedKeywords.slice(0, 16),
    missingKeywords,
    strengths: strengths.slice(0, 6),
    recommendations: recommendations.slice(0, 8),
    sections,
    stats: {
      wordCount: words.length,
      bulletCount,
      metricCount,
      actionVerbCount,
      sectionCount,
      weakPhraseCount,
      firstPersonCount,
      longBulletCount,
    },
  };
}

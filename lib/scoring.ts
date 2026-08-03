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

export type RequirementEvidence = {
  requirement: string;
  status: "supported" | "partial" | "missing";
  score: number;
  evidence: string[];
  guidance: string;
};

export type BulletInsight = {
  text: string;
  score: number;
  signals: string[];
  issue: string;
  guidance: string;
};

export type RiskFlag = {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export type DeepAnalysis = {
  targetRole: string;
  fitLabel: string;
  contextSummary: string;
  strongestEvidence: string;
  biggestRisk: string;
  requirementEvidence: RequirementEvidence[];
  bulletInsights: BulletInsight[];
  riskFlags: RiskFlag[];
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
  details: DeepAnalysis;
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

const REQUIREMENT_CONCEPTS = [
  { label: "Data analysis", aliases: ["data analysis", "analyzing data", "analytics", "data insights", "identify trends"] },
  { label: "Excel", aliases: ["excel", "spreadsheets", "pivot tables", "vlookup", "xlookup"] },
  { label: "SQL", aliases: ["sql", "mysql", "postgresql", "database queries"] },
  { label: "Power BI", aliases: ["power bi", "powerbi", "dax"] },
  { label: "Reporting & dashboards", aliases: ["reporting", "reports", "dashboard", "dashboards", "visualization"] },
  { label: "Customer service", aliases: ["customer service", "customer support", "client support", "customer experience", "csat"] },
  { label: "Stakeholder management", aliases: ["stakeholder management", "stakeholders", "department leads", "executive communication"] },
  { label: "Project management", aliases: ["project management", "project delivery", "project planning", "project coordination"] },
  { label: "Process improvement", aliases: ["process improvement", "workflow improvement", "optimized", "streamlined", "continuous improvement"] },
  { label: "Cross-functional communication", aliases: ["cross-functional", "cross functional", "communication", "presenting recommendations", "collaboration"] },
  { label: "Leadership", aliases: ["leadership", "led", "managed", "mentored", "trained", "team lead"] },
  { label: "Technical support", aliases: ["technical support", "troubleshooting", "service desk", "help desk", "incident management"] },
  { label: "Ticketing systems", aliases: ["ticketing", "tickets", "jira", "zendesk", "servicenow", "freshdesk"] },
  { label: "Sales & account growth", aliases: ["sales", "account management", "revenue", "pipeline", "client retention"] },
  { label: "Product management", aliases: ["product management", "product strategy", "roadmap", "user research", "product discovery"] },
  { label: "Software development", aliases: ["software development", "javascript", "typescript", "react", "node.js", "python", "git"] },
] as const;

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

function cleanLine(line: string) {
  return line.replace(/^\s*(?:[-•▪◦*]|\d+[.)])\s+/, "").replace(/\s+/g, " ").trim();
}

function includesPhrase(text: string, phrase: string) {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function extractTargetRole(jobDescription: string) {
  const compact = jobDescription.replace(/\s+/g, " ").trim();
  if (!compact) return "General ATS readiness";
  const patterns = [
    /(?:hiring|seeking|looking for)\s+(?:an?\s+)?([a-z][a-z /&-]{2,45}?)(?:\s+to\b|\s+who\b|[.,;])/i,
    /(?:role|position|title)\s*[:–-]\s*([a-z][a-z /&-]{2,45})(?:[.,;]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = compact.match(pattern)?.[1]?.trim();
    if (match) return match.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return "Target role";
}

function evidenceLines(resumeText: string) {
  return resumeText
    .split("\n")
    .map(cleanLine)
    .filter((line) => line.length >= 18 && line.length <= 260);
}

function analyzeRequirements(resumeText: string, jobDescription: string): RequirementEvidence[] {
  if (!jobDescription.trim()) return [];
  const lowerJob = jobDescription.toLowerCase();
  const lowerResume = resumeText.toLowerCase();
  const lines = evidenceLines(resumeText);
  const concepts = REQUIREMENT_CONCEPTS
    .filter((concept) => concept.aliases.some((alias) => lowerJob.includes(alias)))
    .sort((a, b) => {
      const firstA = Math.min(...a.aliases.map((alias) => lowerJob.indexOf(alias)).filter((index) => index >= 0));
      const firstB = Math.min(...b.aliases.map((alias) => lowerJob.indexOf(alias)).filter((index) => index >= 0));
      return firstA - firstB;
    })
    .slice(0, 10);

  return concepts.map((concept) => {
    const exactAliases = concept.aliases.filter((alias) => lowerResume.includes(alias));
    const jdAliases = concept.aliases.filter((alias) => lowerJob.includes(alias));
    const usefulTokens = [...new Set(jdAliases.flatMap((alias) => alias.split(/\s+/)).filter((word) => word.length >= 5 && !STOP_WORDS.has(word)))];
    const partialTokens = usefulTokens.filter((token) => lowerResume.includes(token));
    const exactLines = lines.filter((line) => exactAliases.some((alias) => includesPhrase(line, alias)));
    const partialLines = lines.filter((line) => partialTokens.some((token) => includesPhrase(line, token)));
    const matchedLines = (exactLines.length ? exactLines : partialLines).slice(0, 2);
    const substantiveEvidence = exactLines.filter((line) => (line.match(/,/g) ?? []).length < 3);
    const status: RequirementEvidence["status"] = substantiveEvidence.length
      ? "supported"
      : exactAliases.length || (partialTokens.length && matchedLines.length)
        ? "partial"
        : "missing";
    const score = status === "supported" ? Math.min(100, 78 + substantiveEvidence.length * 10) : status === "partial" ? (exactAliases.length ? 55 : 42) : 12;
    const guidance = status === "supported"
      ? `Keep this evidence prominent and connect it to a measurable ${concept.label.toLowerCase()} outcome.`
      : status === "partial"
        ? `The resume hints at this capability, but does not prove it directly. Name the ${concept.label.toLowerCase()} work, tool or outcome you genuinely delivered.`
        : `No credible evidence was found. If you have this experience, add one achievement showing how you used ${concept.label.toLowerCase()} and what changed.`;
    return { requirement: concept.label, status, score, evidence: matchedLines, guidance };
  });
}

function analyzeBullets(resumeText: string): BulletInsight[] {
  const bulletLines = resumeText.split("\n").filter((line) => /^\s*(?:[-•▪◦*]|\d+[.)])\s+/.test(line));
  return bulletLines.slice(0, 8).map((line) => {
    const text = cleanLine(line);
    const lower = text.toLowerCase();
    const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'+.-]*/gu) ?? [];
    const firstWord = words[0]?.toLowerCase() ?? "";
    const hasAction = ACTION_VERBS.includes(firstWord);
    const hasMetric = /\b\d+(?:\.\d+)?(?:\s?%|\+|x|k|m|million|thousand)?\b/i.test(text);
    const hasOutcome = /\b(?:by|resulting in|leading to|so that|which|improved|increased|reduced|saved|grew|accelerated|achieved)\b/i.test(text);
    const hasSpecificity = hasMetric || COMMON_SKILLS.some((skill) => lower.includes(skill)) || REQUIREMENT_CONCEPTS.some((concept) => concept.aliases.some((alias) => lower.includes(alias)));
    const hasWeakLanguage = WEAK_PHRASES.some((phrase) => lower.includes(phrase));
    const readable = words.length >= 8 && words.length <= 30;
    const score = clamp(10 + (hasAction ? 25 : 0) + (hasMetric ? 25 : 0) + (hasOutcome ? 20 : 0) + (hasSpecificity ? 12 : 0) + (readable ? 8 : 0) - (hasWeakLanguage ? 15 : 0));
    const signals = [hasAction && "Strong opening verb", hasMetric && "Quantified", hasOutcome && "Outcome stated", hasSpecificity && "Specific context", readable && "Easy to scan"].filter(Boolean) as string[];
    const missing = [!hasAction && "a decisive opening verb", !hasSpecificity && "specific scope or tools", !hasMetric && "a measurable result", !hasOutcome && "the business or customer outcome"].filter(Boolean) as string[];
    const issue = missing.length ? `Missing ${missing.slice(0, 2).join(" and ")}.` : "This bullet clearly shows ownership, scope and impact.";
    const guidance = score >= 80
      ? "Keep this high-value bullet near the top of the relevant role."
      : `Rewrite as: “${hasAction ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1) : "Improved"} [specific task or process] for [scope]${hasMetric ? "" : " by [X%/time/cost]"}, resulting in [business or customer outcome].”`;
    return { text, score, signals, issue, guidance };
  });
}

function buildRiskFlags(args: { weakPhraseCount: number; firstPersonCount: number; longBulletCount: number; metricCount: number; bulletCount: number; missingSections: string[]; requirements: RequirementEvidence[] }): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const missingRequirements = args.requirements.filter((item) => item.status === "missing");
  if (missingRequirements.length >= 3) flags.push({ severity: "high", title: "Role evidence gap", detail: `${missingRequirements.length} important job requirements have no direct resume evidence.` });
  if (args.missingSections.length) flags.push({ severity: "high", title: "ATS parsing risk", detail: `Standard sections missing: ${args.missingSections.join(", ")}.` });
  if (args.metricCount < Math.max(2, Math.ceil(args.bulletCount / 3))) flags.push({ severity: "medium", title: "Low proof density", detail: "Most experience bullets describe work without proving scale or results." });
  if (args.weakPhraseCount) flags.push({ severity: "medium", title: "Passive positioning", detail: `${args.weakPhraseCount} generic responsibility phrase${args.weakPhraseCount === 1 ? "" : "s"} weaken ownership.` });
  if (args.longBulletCount) flags.push({ severity: "medium", title: "Recruiter scan friction", detail: `${args.longBulletCount} bullet${args.longBulletCount === 1 ? " is" : "s are"} too dense for a fast first read.` });
  if (args.firstPersonCount) flags.push({ severity: "low", title: "Resume convention", detail: `Remove ${args.firstPersonCount} first-person pronoun${args.firstPersonCount === 1 ? "" : "s"}.` });
  return flags.slice(0, 5);
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
  const requirementEvidence = analyzeRequirements(cleanResume, jobDescription);
  const semanticCoverage = requirementEvidence.length
    ? requirementEvidence.reduce((total, item) => total + item.score, 0) / requirementEvidence.length
    : keywordCoverage * 100;

  const keywordScore = mode === "job_match"
    ? clamp(semanticCoverage * 0.7 + keywordCoverage * 100 * 0.3)
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

  const bulletInsights = analyzeBullets(cleanResume);
  const riskFlags = buildRiskFlags({
    weakPhraseCount,
    firstPersonCount,
    longBulletCount,
    metricCount,
    bulletCount,
    missingSections,
    requirements: requirementEvidence,
  });
  const supportedRequirements = requirementEvidence.filter((item) => item.status === "supported");
  const partialRequirements = requirementEvidence.filter((item) => item.status === "partial");
  const missingRequirementEvidence = requirementEvidence.filter((item) => item.status === "missing");
  const strongestRequirement = [...supportedRequirements].sort((a, b) => b.score - a.score)[0];
  const strongestBullet = [...bulletInsights].sort((a, b) => b.score - a.score)[0];
  const targetRole = extractTargetRole(jobDescription);
  const fitLabel = mode === "standalone"
    ? overallScore >= 75 ? "Strong ATS foundation" : overallScore >= 55 ? "Developing ATS foundation" : "Foundational rewrite needed"
    : keywordScore >= 75 ? "Strong contextual fit" : keywordScore >= 55 ? "Moderate contextual fit" : "Limited evidence for this role";
  const contextSummary = mode === "job_match"
    ? `${supportedRequirements.length} of ${requirementEvidence.length || matchedKeywords.length} priority requirements have direct evidence${partialRequirements.length ? `, with ${partialRequirements.length} more only partially demonstrated` : ""}. ${missingRequirementEvidence.length ? `The main application risk is ${missingRequirementEvidence.slice(0, 2).map((item) => item.requirement).join(" and ")}.` : "The resume covers the core role language; improve proof and specificity next."}`
    : `This review measures ATS readability and evidence quality without a job description. Add a target job description for requirement-by-requirement role matching.`;
  const strongestEvidence = strongestRequirement?.evidence[0]
    ?? strongestBullet?.text
    ?? strengths[0];
  const biggestRisk = riskFlags[0]?.detail
    ?? (mode === "job_match" && missingKeywords.length ? `Role language is missing around ${missingKeywords.slice(0, 3).join(", ")}.` : "No critical ATS risk was detected; continue tailoring for each application.");

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
    details: {
      targetRole,
      fitLabel,
      contextSummary,
      strongestEvidence,
      biggestRisk,
      requirementEvidence,
      bulletInsights,
      riskFlags,
    },
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

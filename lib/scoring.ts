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
  category: "responsibility" | "skill" | "tool" | "qualification";
  importance: "required" | "preferred" | "supporting";
  status: "supported" | "partial" | "missing";
  score: number;
  evidence: string[];
  guidance: string;
};

export type RoleMismatch = {
  requirement: string;
  category: RequirementEvidence["category"] | "role";
  impact: "critical" | "important" | "minor";
  reason: string;
  action: string;
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
  resumeProfile: string;
  roleFitScore: number;
  roleFitVerdict: string;
  fitLabel: string;
  contextSummary: string;
  strongestEvidence: string;
  biggestRisk: string;
  requirementEvidence: RequirementEvidence[];
  mismatches: RoleMismatch[];
  transferableStrengths: string[];
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
  { label: "Software engineering", aliases: ["software engineering", "software engineer", "software development", "application development"] },
] as const;

const ATOMIC_TOOLS = [
  { label: "TypeScript", aliases: ["typescript"] },
  { label: "JavaScript", aliases: ["javascript"] },
  { label: "React", aliases: ["react", "react.js", "reactjs"] },
  { label: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
  { label: "Python", aliases: ["python"] },
  { label: "AWS", aliases: ["aws", "amazon web services"] },
  { label: "Git", aliases: ["git", "github", "gitlab"] },
  { label: "Salesforce", aliases: ["salesforce"] },
  { label: "Tableau", aliases: ["tableau"] },
  { label: "Figma", aliases: ["figma"] },
] as const;

type RequirementDefinition = {
  label: string;
  aliases: string[];
  category: RequirementEvidence["category"];
  importance: RequirementEvidence["importance"];
};

const TOOL_REQUIREMENTS = new Set(["Excel", "SQL", "Power BI", "Ticketing systems", "TypeScript", "JavaScript", "React", "Node.js", "Python", "AWS", "Git", "Salesforce", "Tableau", "Figma"]);

const ROLE_DOMAINS = [
  { label: "Operations", aliases: ["operations", "operational", "process", "workflow", "service delivery"] },
  { label: "Customer support", aliases: ["customer service", "customer support", "service desk", "help desk", "tickets", "csat"] },
  { label: "Data & analytics", aliases: ["analyst", "analytics", "data analysis", "sql", "power bi", "tableau", "reporting"] },
  { label: "Software engineering", aliases: ["software engineer", "developer", "frontend", "backend", "javascript", "typescript", "react", "python"] },
  { label: "Product", aliases: ["product manager", "product management", "roadmap", "product strategy", "user research"] },
  { label: "Sales", aliases: ["sales", "account management", "business development", "revenue", "pipeline"] },
  { label: "Marketing", aliases: ["marketing", "seo", "content strategy", "campaign", "brand"] },
  { label: "Finance", aliases: ["finance", "financial", "accounting", "audit", "taxation", "bookkeeping"] },
  { label: "Human resources", aliases: ["human resources", "hr", "recruitment", "talent acquisition", "employee relations"] },
  { label: "Education", aliases: ["teacher", "teaching", "education", "curriculum", "classroom", "student"] },
  { label: "Design", aliases: ["designer", "design", "figma", "ux", "ui", "visual"] },
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
  const firstLine = jobDescription.split("\n").map(cleanLine).find((line) => line.length >= 3 && line.length <= 70);
  if (firstLine && (firstLine.match(/[a-z]+/gi) ?? []).length <= 9 && !/[.!?]$/.test(firstLine)) return firstLine;
  return "Target role";
}

function evidenceLines(resumeText: string) {
  return resumeText
    .split("\n")
    .map(cleanLine)
    .filter((line) => line.length >= 18 && line.length <= 260);
}

function stemToken(token: string) {
  return token.toLowerCase().replace(/[^a-z0-9+#]/g, "").replace(/(?:ments?|ations?|ingly|edly|ing|ed|ies|s)$/i, "");
}

function meaningfulTokens(value: string) {
  return [...new Set((value.match(/[a-z][a-z0-9+#-]{2,}/gi) ?? [])
    .map(stemToken)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))];
}

function importanceFor(jobDescription: string, aliases: readonly string[]): RequirementEvidence["importance"] {
  const lower = jobDescription.toLowerCase();
  const index = Math.min(...aliases.map((alias) => lower.indexOf(alias)).filter((position) => position >= 0));
  const context = Number.isFinite(index) ? lower.slice(Math.max(0, index - 90), index + 120) : lower;
  if (/\b(?:must|required|mandatory|minimum|essential|need to)\b/.test(context)) return "required";
  if (/\b(?:preferred|desirable|nice to have|bonus)\b/.test(context)) return "preferred";
  return "supporting";
}

function categoryFor(label: string): RequirementEvidence["category"] {
  if (TOOL_REQUIREMENTS.has(label)) return "tool";
  if (/degree|years?|certif|licen[cs]e|qualification/i.test(label)) return "qualification";
  if (/management|analysis|communication|leadership|service|support|development|engineering|reporting/i.test(label)) return "skill";
  return "responsibility";
}

function requirementLabel(value: string) {
  return value
    .replace(/^[-•▪◦*\d.)\s]+/, "")
    .replace(/^(?:responsibilities?(?: include)?|requirements?(?: include)?|you will|must|should|required to|responsible for|experience with|proficiency in|knowledge of)\s*:?[\s-]*/i, "")
    .replace(/[.;:]$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequirementDefinitions(jobDescription: string): RequirementDefinition[] {
  if (!jobDescription.trim()) return [];
  const lowerJob = jobDescription.toLowerCase();
  const definitions: RequirementDefinition[] = REQUIREMENT_CONCEPTS
    .filter((concept) => concept.aliases.some((alias) => lowerJob.includes(alias)))
    .map((concept) => ({
      label: concept.label,
      aliases: [...concept.aliases],
      category: categoryFor(concept.label),
      importance: importanceFor(jobDescription, concept.aliases),
    }));
  for (const tool of ATOMIC_TOOLS) {
    if (tool.aliases.some((alias) => lowerJob.includes(alias)) && !definitions.some((definition) => definition.label === tool.label)) {
      definitions.push({ label: tool.label, aliases: [...tool.aliases], category: "tool", importance: importanceFor(jobDescription, tool.aliases) });
    }
  }

  const rawLines = jobDescription.split(/\n|(?<=[.!?])\s+/).map(cleanLine).filter(Boolean);
  const candidates: Array<{ text: string; category: RequirementEvidence["category"] }> = [];
  for (const line of rawLines) {
    const qualificationMatches = line.match(/\b(?:\d+\+?\s+years?(?:\s+of)?\s+experience(?:\s+(?:in|with)\s+[a-z0-9 &+.#-]{2,45})?|(?:bachelor(?:'s)?|master(?:'s)?|graduate|postgraduate)\s+(?:degree|qualification)(?:\s+in\s+[a-z &-]{2,40})?|[a-z &-]{2,35}\s+certification)\b/gi) ?? [];
    qualificationMatches.forEach((text) => candidates.push({ text: text.replace(/\s+(?:required|preferred|mandatory)$/i, ""), category: "qualification" }));

    const isResponsibilityLine = /\b(?:responsibilit|you will|responsible for|duties|expected to|include|including)\b/i.test(line) || /^[-•▪◦*]/.test(line);
    if (!isResponsibilityLine) continue;
    const content = line.includes(":") ? line.slice(line.indexOf(":") + 1) : line.replace(/^.*?\b(?:include|including|responsible for|you will|expected to)\b/i, "");
    content.split(/[,;]|\s+and\s+(?=[a-z]+ing\b)/i).forEach((part) => {
      const text = requirementLabel(part);
      const wordCount = (text.match(/[a-z0-9+#-]+/gi) ?? []).length;
      if (wordCount >= 2 && wordCount <= 11 && /\b(?:ing|manage|lead|build|create|develop|deliver|support|analy|identify|present|improve|maintain|coordinate|resolve|design|review|mentor|deploy)/i.test(text)) {
        candidates.push({ text, category: "responsibility" });
      }
    });
  }

  for (const candidate of candidates) {
    const label = requirementLabel(candidate.text);
    const labelTokens = meaningfulTokens(label);
    if (labelTokens.length < 2) continue;
    const duplicate = definitions.some((definition) => {
      const existing = meaningfulTokens(`${definition.label} ${definition.aliases.join(" ")}`);
      return labelTokens.filter((token) => existing.includes(token)).length / labelTokens.length >= 0.65;
    });
    if (!duplicate) definitions.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      aliases: [label.toLowerCase()],
      category: candidate.category,
      importance: importanceFor(jobDescription, [label.toLowerCase()]),
    });
  }

  const importanceOrder = { required: 0, supporting: 1, preferred: 2 } as const;
  return definitions
    .sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance])
    .slice(0, 14);
}

function analyzeRequirements(resumeText: string, jobDescription: string): RequirementEvidence[] {
  const definitions = extractRequirementDefinitions(jobDescription);
  const lowerResume = resumeText.toLowerCase();
  const lines = evidenceLines(resumeText);

  return definitions.map((definition) => {
    const exactAliases = definition.aliases.filter((alias) => lowerResume.includes(alias));
    const tokenVariants = [definition.label, ...definition.aliases].map(meaningfulTokens).filter((tokens) => tokens.length);
    const scoredLines = lines.map((line) => {
      const lineTokens = meaningfulTokens(line);
      const coverage = Math.max(...tokenVariants.map((tokens) => tokens.filter((token) => lineTokens.includes(token)).length / tokens.length));
      return { line, coverage };
    }).filter((item) => item.coverage > 0).sort((a, b) => b.coverage - a.coverage);
    const exactLines = lines.filter((line) => exactAliases.some((alias) => includesPhrase(line, alias)));
    const matchedLines = [...new Set([...exactLines, ...scoredLines.filter((item) => item.coverage >= 0.34).map((item) => item.line)])].slice(0, 2);
    const substantiveEvidence = matchedLines.filter((line) => (line.match(/,/g) ?? []).length < 3);
    const bestCoverage = scoredLines[0]?.coverage ?? 0;
    const supported = substantiveEvidence.length > 0 && (exactAliases.length > 0 || bestCoverage >= 0.67);
    const partial = exactAliases.length > 0 || bestCoverage >= 0.34;
    const status: RequirementEvidence["status"] = supported ? "supported" : partial ? "partial" : "missing";
    const score = status === "supported" ? clamp(78 + Math.min(substantiveEvidence.length * 8, 16) + bestCoverage * 6) : status === "partial" ? clamp(38 + bestCoverage * 28 + (exactAliases.length ? 8 : 0)) : 8;
    const subject = definition.label.toLowerCase();
    const guidance = status === "supported"
      ? `Keep this evidence prominent and connect it to a measurable ${subject} outcome.`
      : status === "partial"
        ? `The resume suggests ${subject}, but does not prove the full requirement. Add a specific example, scope and result only if it is true.`
        : definition.category === "qualification"
          ? `This qualification is not visible. Add it only if you hold it; otherwise treat it as a genuine eligibility gap.`
          : `No credible evidence was found. If you have this experience, add one achievement showing how you used ${subject} and what changed.`;
    return { requirement: definition.label, category: definition.category, importance: definition.importance, status, score, evidence: matchedLines, guidance };
  });
}

function detectDomain(text: string) {
  const lower = text.toLowerCase();
  return ROLE_DOMAINS.map((domain) => ({ ...domain, score: domain.aliases.reduce((total, alias) => total + (lower.includes(alias) ? (alias.includes(" ") ? 3 : 1) : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0];
}

function buildRoleComparison(resumeText: string, jobDescription: string, targetRole: string, requirements: RequirementEvidence[]) {
  const roleDomain = detectDomain(targetRole);
  const targetDomain = roleDomain?.score ? roleDomain : detectDomain(jobDescription);
  const resumeDomain = detectDomain(resumeText);
  const resumeProfile = resumeDomain?.score ? resumeDomain.label : "General professional experience";
  const targetEvidenceInResume = targetDomain?.aliases.reduce((total, alias) => total + (resumeText.toLowerCase().includes(alias) ? 1 : 0), 0) ?? 0;
  const domainAligned = Boolean(targetDomain?.score && resumeDomain?.score && targetDomain.label === resumeDomain.label);
  const domainScore = !targetDomain?.score || !resumeDomain?.score ? 55 : domainAligned ? 100 : targetEvidenceInResume ? 72 : 20;
  const weighted = requirements.reduce((totals, requirement) => {
    const weight = requirement.importance === "required" ? 1.5 : requirement.importance === "preferred" ? 0.7 : 1;
    return { points: totals.points + requirement.score * weight, weight: totals.weight + weight };
  }, { points: 0, weight: 0 });
  const evidenceScore = weighted.weight ? weighted.points / weighted.weight : 40;
  const roleFitScore = clamp(evidenceScore * 0.82 + domainScore * 0.18);
  const roleFitVerdict = roleFitScore >= 78 ? "Well aligned" : roleFitScore >= 60 ? "Plausible match with gaps" : roleFitScore >= 42 ? "Stretch role" : "Low current match";

  const mismatches: RoleMismatch[] = requirements
    .filter((item) => item.status !== "supported")
    .map((item) => ({
      requirement: item.requirement,
      category: item.category,
      impact: item.status === "missing" && item.importance === "required" ? "critical" : item.status === "missing" ? "important" : "minor",
      reason: item.status === "missing" ? "No direct evidence appears in the resume." : "Related language appears, but the resume does not demonstrate the full requirement.",
      action: item.guidance,
    }));
  if (targetDomain?.score && resumeDomain?.score && domainScore < 40) mismatches.unshift({
    requirement: `${targetDomain.label} role background`,
    category: "role",
    impact: "critical",
    reason: `The job targets ${targetDomain.label}, while the resume is currently strongest in ${resumeProfile}.`,
    action: `Lead with transferable achievements relevant to ${targetDomain.label}. If you lack real exposure, treat this as a role-level gap rather than adding unsupported keywords.`,
  });
  const impactOrder = { critical: 0, important: 1, minor: 2 } as const;
  mismatches.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
  const transferableStrengths = requirements.filter((item) => item.status === "supported" || item.status === "partial").slice(0, 5).map((item) => item.requirement);
  return { resumeProfile, roleFitScore, roleFitVerdict, mismatches: mismatches.slice(0, 10), transferableStrengths };
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
  const targetRole = extractTargetRole(jobDescription);
  const roleComparison = buildRoleComparison(cleanResume, jobDescription, targetRole, requirementEvidence);

  const keywordScore = mode === "job_match"
    ? clamp(roleComparison.roleFitScore * 0.8 + keywordCoverage * 100 * 0.2)
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
  const priorityRequirementGaps = requirementEvidence.filter((item) => item.status === "missing").slice(0, 6);
  if (mode === "job_match" && (priorityRequirementGaps.length || missingKeywords.length)) {
    recommendations.push({
      id: "missing-keywords", category: "keywords", priority: keywordScore < 55 ? "high" : "medium",
      title: "Close the highest-value keyword gaps",
      detail: `Build truthful evidence around: ${(priorityRequirementGaps.length ? priorityRequirementGaps.map((item) => item.requirement) : missingKeywords.slice(0, 6)).join(", ")}. Do not simply paste a keyword list.`,
      why: "Most ATS tools rank resumes partly by role-specific language and context.",
      example: `Instead of “Used relevant tools,” show how you used ${priorityRequirementGaps[0]?.requirement ?? missingKeywords[0] ?? "a role-specific skill"}, at what scale, and with what result.`,
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
  const fitLabel = mode === "standalone"
    ? overallScore >= 75 ? "Strong ATS foundation" : overallScore >= 55 ? "Developing ATS foundation" : "Foundational rewrite needed"
    : roleComparison.roleFitVerdict;
  const contextSummary = mode === "job_match"
    ? `${supportedRequirements.length} of ${requirementEvidence.length || matchedKeywords.length} priority requirements have direct evidence${partialRequirements.length ? `, with ${partialRequirements.length} more only partially demonstrated` : ""}. ${missingRequirementEvidence.length ? `The main application risk is ${missingRequirementEvidence.slice(0, 2).map((item) => item.requirement).join(" and ")}.` : "The resume covers the core role language; improve proof and specificity next."}`
    : `This review measures ATS readability and evidence quality without a job description. Add a target job description for requirement-by-requirement role matching.`;
  const strongestEvidence = strongestRequirement?.evidence[0]
    ?? strongestBullet?.text
    ?? strengths[0];
  const biggestRisk = mode === "job_match" && roleComparison.mismatches.length
    ? roleComparison.mismatches[0].reason
    : riskFlags[0]?.detail
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
      resumeProfile: roleComparison.resumeProfile,
      roleFitScore: mode === "job_match" ? roleComparison.roleFitScore : overallScore,
      roleFitVerdict: mode === "job_match" ? roleComparison.roleFitVerdict : fitLabel,
      fitLabel,
      contextSummary,
      strongestEvidence,
      biggestRisk,
      requirementEvidence,
      mismatches: mode === "job_match" ? roleComparison.mismatches : [],
      transferableStrengths: mode === "job_match" ? roleComparison.transferableStrengths : [],
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

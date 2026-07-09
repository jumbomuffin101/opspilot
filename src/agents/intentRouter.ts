import type { RoutedConversationalIntent } from "@/src/types/slack";

const MENTION_PATTERN = /<@[A-Z0-9]+>/gi;
const INVESTIGATION_PREFIX =
  /^(?:please\s+)?(?:investigate|diagnose|triage|analy[sz]e|look\s+into|check\s+on)\s*/i;

function cleanRequest(text: string): string {
  return text.replace(MENTION_PATTERN, " ").replace(/\s+/g, " ").trim();
}

function matches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function isRepoAuditRequest(text: string): boolean {
  const repositoryTarget = String.raw`(?:repo|repository|codebase)`;
  const optionalDescriptor = String.raw`(?:\s+[a-z0-9][a-z0-9-]*){0,6}`;
  const patterns = [
    new RegExp(String.raw`\bcheck\s+(?:my|the|this)${optionalDescriptor}\s+${repositoryTarget}\b`),
    new RegExp(String.raw`\baudit\s+(?:my|the|this)?${optionalDescriptor}\s*${repositoryTarget}\b`),
    new RegExp(String.raw`\binspect\s+(?:my|the|this)?${optionalDescriptor}\s*${repositoryTarget}\b`),
    new RegExp(String.raw`\breview\s+(?:my|the|this)?${optionalDescriptor}\s*${repositoryTarget}\b`),
    /\breview\s+recent\s+changes\b/,
    /\bwhat\s+changed\s+recently\b/,
    /\bany\s+repo\s+issues\b/,
    /\brepository\s+issues\b/,
    /\bcodebase\s+issues\b/,
    /\bcheck\s+codebase\b/,
    /\baudit\s+codebase\b/,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

export function routeConversationalIntent(text: string): RoutedConversationalIntent {
  const query = cleanRequest(text);
  const normalized = query.toLowerCase();
  const executiveSummary = matches(normalized, /\bexecutive\b|\bleadership\b/);

  if (!query || matches(normalized, /^(help|what can you do|how do i use this|show commands|commands)\??$/)) {
    return { intent: "help", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(resolve|resolved|close incident|mark (?:it )?resolved)\b/)) {
    return { intent: "resolve", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(postmortem|post-mortem|incident review|retrospective)\b/)) {
    return { intent: "postmortem", query, executiveSummary: false };
  }

  if (isRepoAuditRequest(normalized)) {
    return { intent: "repo_audit", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(summarize this repo|summarize this repository|what does this project do|explain this codebase)\b/)) {
    return { intent: "repo_summary", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(explain the highest risk change|highest[-\s]risk change|why is this commit risky|explain the .*risk|risky commit|security concerns|any security concerns)\b/)) {
    return { intent: "risk_explain", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(what should i test|generate a test plan|test plan|what tests should i run before deploying)\b/)) {
    return { intent: "test_plan", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(write release notes|release notes|summarize recent changes for release|generate changelog|changelog)\b/)) {
    return { intent: "release_notes", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(what should we do next|give next actions|next actions|next steps|recommend follow[-\s]?up actions|follow[-\s]?up actions)\b/)) {
    return { intent: "next_steps", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(create a runbook|draft a rollback runbook|rollback runbook|remediation plan|what is the remediation plan|runbook)\b/)) {
    return { intent: "runbook", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(who owns this|who should review this|assign reviewers|reviewers|owner[s]?)\b/)) {
    return { intent: "owners", query, executiveSummary: false };
  }

  if (INVESTIGATION_PREFIX.test(query)) {
    return {
      intent: "investigate",
      query: query.replace(INVESTIGATION_PREFIX, "").trim(),
      executiveSummary: false,
    };
  }

  if (matches(normalized, /\b(summarize|summary|brief|recap)\b/)) {
    return { intent: "summarize", query, executiveSummary };
  }

  if (matches(normalized, /\b(owner|owns|on[- ]?call|responsible team)\b/)) {
    return { intent: "owner", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(deploy|deployment|release|rollout|commit)\b/)) {
    return { intent: "deployments", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(timeline|sequence|what happened when|chronology)\b/)) {
    return { intent: "timeline", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(evidence|signal|proof|supports?|correlation)\b/)) {
    return { intent: "evidence", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(explain|why|root cause|responsible|hypothesis)\b/)) {
    return { intent: "explain", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(status|current state|where are we|update)\b/)) {
    return { intent: "status", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(fail(?:ure|ing|s)?|error|outage|incident|degraded|latency|500s?)\b/)) {
    return { intent: "investigate", query, executiveSummary: false };
  }

  return { intent: "help", query, executiveSummary: false };
}

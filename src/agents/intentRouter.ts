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

export function routeConversationalIntent(text: string): RoutedConversationalIntent {
  const query = cleanRequest(text);
  const normalized = query.toLowerCase();
  const executiveSummary = matches(normalized, /\bexecutive\b|\bleadership\b/);

  if (!query || matches(normalized, /^(help|what can you do|show commands|commands)\??$/)) {
    return { intent: "help", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(resolve|resolved|close incident|mark (?:it )?resolved)\b/)) {
    return { intent: "resolve", query, executiveSummary: false };
  }

  if (matches(normalized, /\b(postmortem|post-mortem|incident review|retrospective)\b/)) {
    return { intent: "postmortem", query, executiveSummary: false };
  }

  if (
    matches(
      normalized,
      /\b(check my repo|repo issues|audit repo|audit this repository|review recent changes|inspect (?:the )?repository|what changed recently|show recent commits|security concerns|what should i test|highest risk change)\b/,
    )
  ) {
    return { intent: "repo_audit", query, executiveSummary: false };
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

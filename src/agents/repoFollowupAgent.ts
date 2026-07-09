import type { RepoAuditChange, RepoAuditResult } from "@/src/types/tools";

export interface RepoFollowupResponse {
  title: string;
  summary: string;
  bullets: string[];
  context: string;
}

function allChanges(audit: RepoAuditResult): RepoAuditChange[] {
  return [
    ...audit.highRiskChanges,
    ...audit.mediumRiskChanges,
    ...audit.lowRiskChanges,
  ];
}

function formatChange(change: RepoAuditChange): string {
  const files = change.filesChanged.slice(0, 3).join(", ") || "changed files unavailable";
  return `${change.sha.slice(0, 7)} — ${change.message} (${files})`;
}

function highestRiskChange(audit: RepoAuditResult): RepoAuditChange | null {
  return audit.highRiskChanges[0] ?? audit.mediumRiskChanges[0] ?? audit.lowRiskChanges[0] ?? null;
}

function domainFromFiles(files: readonly string[]): string {
  if (files.some((file) => /auth|oauth|session|middleware|permission/i.test(file))) {
    return "authentication and access control";
  }
  if (files.some((file) => /migration|database|db\/|schema/i.test(file))) {
    return "database and persistence";
  }
  if (files.some((file) => /checkout|payment|order/i.test(file))) {
    return "commerce transaction flow";
  }
  if (files.some((file) => /api|route|handler|controller/i.test(file))) {
    return "API behavior";
  }
  if (files.some((file) => /config|env|package|lock|docker|vercel/i.test(file))) {
    return "runtime configuration and dependencies";
  }
  return "application behavior";
}

export function generateRepoSummary(audit: RepoAuditResult): RepoFollowupResponse {
  const changes = allChanges(audit);
  const topDomains = [...new Set(changes.flatMap((change) => change.filesChanged).map((file) => {
    if (/auth|oauth|session|middleware|permission/i.test(file)) return "auth";
    if (/api|route|handler|controller/i.test(file)) return "api";
    if (/config|env|package|lock|docker|vercel/i.test(file)) return "config";
    if (/migration|database|db\/|schema/i.test(file)) return "database";
    if (/checkout|payment|order/i.test(file)) return "commerce";
    return "general";
  }))].slice(0, 4);

  return {
    title: "Repository Summary",
    summary: `${audit.repo.owner}/${audit.repo.name} was reviewed across ${audit.scannedCommits} recent commits. ${audit.summary}`,
    bullets: [
      `Primary areas touched: ${topDomains.length ? topDomains.join(", ") : "not enough changed-file metadata"}.`,
      `${audit.highRiskChanges.length} high-risk, ${audit.mediumRiskChanges.length} medium-risk, ${audit.lowRiskChanges.length} low-risk changes found.`,
      audit.metadataOnly
        ? "This summary is based on commit metadata and changed-file paths."
        : "This summary includes limited small-file content signals where available.",
    ],
    context: "Ask for release notes, a test plan, reviewers, or a rollback runbook from this audit.",
  };
}

export function explainHighestRiskChange(audit: RepoAuditResult): RepoFollowupResponse {
  const change = highestRiskChange(audit);
  if (!change) {
    return {
      title: "Risk Explanation",
      summary: "OpsPilot did not find recent changes to explain.",
      bullets: ["Run a fresh repository audit after new commits land."],
      context: "No GitHub calls were rerun for this answer.",
    };
  }

  return {
    title: "Highest-Risk Change",
    summary: `${formatChange(change)} is the leading review target because it touches ${domainFromFiles(change.filesChanged)}.`,
    bullets: [
      ...change.reasons.slice(0, 4),
      ...change.contentSignals.slice(0, 2),
    ],
    context: "Risk is deterministic and based on paths, commit metadata, and limited content signals.",
  };
}

export function generateTestPlan(audit: RepoAuditResult): RepoFollowupResponse {
  const change = highestRiskChange(audit);
  const domain = change ? domainFromFiles(change.filesChanged) : "recent code changes";

  return {
    title: "Recommended Test Plan",
    summary: `Focus validation on ${domain} before deployment.`,
    bullets: [
      "Run unit and integration tests covering the changed paths.",
      "Validate API success, error, and permission paths in staging.",
      ...(audit.configConcerns.length
        ? ["Verify environment variables, configuration defaults, and dependency lockfile changes."]
        : []),
      ...(audit.securityConcerns.length
        ? ["Exercise auth/OAuth/session flows and confirm no token or permission regressions."]
        : []),
      "Compare CI results with deployment health checks and production telemetry before release.",
    ],
    context: "This is a generated validation checklist; OpsPilot did not execute tests.",
  };
}

export function generateReleaseNotes(audit: RepoAuditResult): RepoFollowupResponse {
  const changes = allChanges(audit).slice(0, 6);

  return {
    title: "Draft Release Notes",
    summary: `Recent changes for ${audit.repo.owner}/${audit.repo.name}.`,
    bullets: changes.length
      ? changes.map((change) => `${change.message} (${change.sha.slice(0, 7)})`)
      : ["No recent commits were available in the latest audit."],
    context: "Review and edit before publishing; this is based on commit messages and changed-file metadata.",
  };
}

export function generateNextSteps(audit: RepoAuditResult): RepoFollowupResponse {
  return {
    title: "Recommended Next Actions",
    summary: "Use the latest repository audit to close review gaps before release.",
    bullets: audit.recommendedActions.length
      ? audit.recommendedActions
      : ["Run a fresh repository audit, review the highest-risk change, then validate in staging."],
    context: "No new repository data was fetched for these next steps.",
  };
}

export function generateRunbook(audit: RepoAuditResult): RepoFollowupResponse {
  const change = highestRiskChange(audit);
  const domain = change ? domainFromFiles(change.filesChanged) : "the recent release";

  return {
    title: "Rollback Runbook",
    summary: `Use this runbook if ${domain} regresses after deployment.`,
    bullets: [
      "Confirm regression scope with logs, metrics, and the affected user journey.",
      "Pause further deploys for the selected repository until the owner validates the change.",
      change ? `Review and, if needed, revert or patch ${change.sha.slice(0, 7)}: ${change.message}.` : "Identify the commit range deployed most recently.",
      "Rollback to the last known-good deployment if user-facing impact is confirmed.",
      "Re-run smoke tests and monitor error rate, latency, and auth/API success metrics.",
      "Post a Slack update with the rollback decision, owner, and validation status.",
    ],
    context: "This is a deterministic runbook generated from the latest repo audit.",
  };
}

export function suggestReviewOwners(audit: RepoAuditResult): RepoFollowupResponse {
  const changes = allChanges(audit);
  const authors = [...new Set(changes.map((change) => change.author))].slice(0, 4);
  const domains = [...new Set(changes.map((change) => domainFromFiles(change.filesChanged)))].slice(0, 4);

  return {
    title: "Suggested Review Owners",
    summary: "Route review to people closest to the changed code and the affected domain.",
    bullets: [
      ...(authors.length ? [`Commit authors to consult: ${authors.join(", ")}.`] : []),
      ...(domains.length ? [`Domain reviewers needed for: ${domains.join(", ")}.`] : []),
      ...(audit.securityConcerns.length ? ["Add a security reviewer for auth/OAuth/token handling changes."] : []),
      ...(audit.configConcerns.length ? ["Add an infrastructure or platform reviewer for config/dependency changes."] : []),
      "Ask the service owner to approve release readiness before deployment.",
    ],
    context: "OpsPilot inferred reviewers from commit authors and changed-file domains.",
  };
}

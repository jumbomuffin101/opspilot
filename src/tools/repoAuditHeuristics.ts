import type { RepoAuditChange, RepoAuditRiskLevel } from "@/src/types/tools";

export interface RepoAuditCommitBase {
  sha: string;
  message: string;
  author: string;
  committedAt: string;
  url?: string;
}

function isDocumentationOrAsset(file: string): boolean {
  return /(^docs\/|^README|\.md$|\.mdx$|\.css$|\.scss$|\.svg$|\.png$|\.jpg$|\.jpeg$)/i.test(file);
}

export function changedFilesAreDocsOrStyles(filesChanged: readonly string[]): boolean {
  return filesChanged.length > 0 && filesChanged.every(isDocumentationOrAsset);
}

export function extractContentSignals(file: string, content: string): string[] {
  const signals: string[] = [];
  if (isDocumentationOrAsset(file)) return signals;

  if (/process\.env|import\.meta\.env|NEXT_PUBLIC_|SLACK_|GITHUB_|OPENAI_|DATABASE_URL/.test(content)) {
    signals.push(`${file} references runtime environment variables or secret-backed configuration.`);
  }
  if (/oauth|token|secret|authorization|bearer/i.test(content)) {
    signals.push(`${file} contains auth, OAuth, token, or authorization logic.`);
  }
  if (/migration|alter table|create table|drop table/i.test(content)) {
    signals.push(`${file} contains database migration or schema operations.`);
  }
  return signals;
}

function classifyFile(file: string): {
  high: string[];
  medium: string[];
  config: string[];
  security: string[];
} {
  const normalized = file.toLowerCase();
  const high: string[] = [];
  const medium: string[] = [];
  const config: string[] = [];
  const security: string[] = [];

  if (isDocumentationOrAsset(file)) {
    return { high, medium, config, security };
  }

  if (/(auth|session|jwt|permission|rbac|middleware|security)/i.test(normalized)) {
    high.push(`security-sensitive path: ${file}`);
    security.push(`${file} touches authentication, authorization, middleware, or security code.`);
  }

  if (/(migration|migrations|schema\.sql|\/db\/|database)/i.test(normalized)) {
    high.push(`operational database or migration path: ${file}`);
    config.push(`${file} may change persistence behavior, migration ordering, or database shape.`);
  }

  if (
    /(^|\/)(\.env.*|.*config.*|next\.config\.[jt]s|vercel\.json|dockerfile|package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(
      normalized,
    )
  ) {
    high.push(`configuration or dependency path: ${file}`);
    config.push(`${file} may change runtime configuration, deployment behavior, or dependencies.`);
  }

  if (/(checkout|payment|payments|order|orders)/i.test(normalized)) {
    high.push(`business-critical commerce path: ${file}`);
  }

  if (/(^app\/api\/|^pages\/api\/|\/api\/|route\.ts$|route\.js$|controller|handler)/i.test(normalized)) {
    high.push(`API route or handler path: ${file}`);
  }

  if (/(setup|onboarding|oauth|integration|github|slack|openai|stripe|webhook)/i.test(normalized)) {
    medium.push(`integration or onboarding path: ${file}`);
  }

  return { high, medium, config, security };
}

export function classifyRepoAuditChange(
  commit: RepoAuditCommitBase,
  filesChanged: readonly string[],
): RepoAuditChange {
  const highReasons = new Set<string>();
  const mediumReasons = new Set<string>();
  const configConcerns: string[] = [];
  const securityConcerns: string[] = [];

  for (const file of filesChanged) {
    const classification = classifyFile(file);
    classification.high.forEach((reason) => highReasons.add(reason));
    classification.medium.forEach((reason) => mediumReasons.add(reason));
    configConcerns.push(...classification.config);
    securityConcerns.push(...classification.security);
  }

  if (/\b(package|dependency|deps|upgrade|bump)\b/i.test(commit.message)) {
    highReasons.add("dependency-related commit message");
  }

  if (filesChanged.length >= 10) {
    mediumReasons.add(`large commit touching ${filesChanged.length} files`);
  }

  let risk: RepoAuditRiskLevel = "low";
  let reasons: string[] = ["documentation, style, or low-blast-radius metadata change"];
  if (highReasons.size > 0) {
    risk = "high";
    reasons = [...highReasons].slice(0, 5);
  } else if (mediumReasons.size > 0 || !changedFilesAreDocsOrStyles(filesChanged)) {
    risk = "medium";
    reasons = mediumReasons.size > 0
      ? [...mediumReasons].slice(0, 5)
      : ["application code changed without a high-risk path match"];
  }

  return {
    ...commit,
    filesChanged: [...filesChanged],
    risk,
    reasons,
    contentSignals: [...new Set([...configConcerns, ...securityConcerns])].slice(0, 4),
  };
}

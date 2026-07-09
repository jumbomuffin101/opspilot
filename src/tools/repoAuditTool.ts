import { mockDeployments } from "@/src/data/mockDeployments";
import { logger } from "@/src/lib/logger";
import { isDemoMode } from "@/src/lib/utils";
import { getGitHubServiceConfig } from "@/src/services/github";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { GitHubRepository } from "@/src/types/github";
import type { RepoAuditChange, RepoAuditResult, RepoAuditRiskLevel } from "@/src/types/tools";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_TIMEOUT_MS = 8_000;
const COMMIT_LIMIT = 10;
const DETAIL_LIMIT = 3;
const CONTENT_FETCH_LIMIT = 4;
const SMALL_FILE_LIMIT_BYTES = 24_000;
const MOCK_REPO: GitHubRepository = { owner: "acme-commerce", name: "checkout-api" };

interface CommitBase {
  sha: string;
  message: string;
  author: string;
  committedAt: string;
  url?: string;
}

interface CommitDetail {
  sha: string;
  filesChanged: string[];
  contentSignals: string[];
}

class GitHubAuditRequestError extends Error {
  constructor(public readonly status: number) {
    super(`GitHub audit request failed with status ${status}`);
    this.name = "GitHubAuditRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const nested = value[key];
  return isRecord(nested) ? nested : null;
}

function extractCommitBase(value: unknown): CommitBase | null {
  if (!isRecord(value)) return null;
  const commit = nestedRecord(value, "commit");
  const commitAuthor = commit ? nestedRecord(commit, "author") : null;
  const commitCommitter = commit ? nestedRecord(commit, "committer") : null;
  const apiAuthor = nestedRecord(value, "author");
  const sha = optionalString(value.sha);
  const message = optionalString(commit?.message);
  const committedAt =
    optionalString(commitAuthor?.date) ?? optionalString(commitCommitter?.date);

  if (!sha || !message || !committedAt || !Number.isFinite(Date.parse(committedAt))) {
    return null;
  }

  return {
    sha,
    message,
    author:
      optionalString(apiAuthor?.login) ??
      optionalString(commitAuthor?.name) ??
      optionalString(commitCommitter?.name) ??
      "Unknown author",
    committedAt,
    url: optionalString(value.html_url),
  };
}

function extractFiles(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.files)) return [];

  return value.files
    .map((file) => (isRecord(file) ? optionalString(file.filename) : undefined))
    .filter((filename): filename is string => Boolean(filename));
}

function changedFilesAreDocsOrStyles(filesChanged: readonly string[]): boolean {
  return (
    filesChanged.length > 0 &&
    filesChanged.every((file) =>
      /(^docs\/|^README|\.md$|\.mdx$|\.css$|\.scss$|\.svg$|\.png$|\.jpg$|\.jpeg$)/i.test(file),
    )
  );
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

  if (/(auth|session|jwt|permission|rbac|middleware|security)/i.test(normalized)) {
    high.push(`security-sensitive path: ${file}`);
    security.push(`${file} touches authentication, authorization, middleware, or security code.`);
  }

  if (/(migration|migrations|schema\.sql|\/db\/|database)/i.test(normalized)) {
    high.push(`database schema or migration path: ${file}`);
    config.push(`${file} may change persistence behavior or database shape.`);
  }

  if (/(\.env|config|next\.config|vercel\.json|dockerfile|package\.json|lock)$/i.test(normalized)) {
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

function classifyChange(commit: CommitBase, filesChanged: readonly string[]): RepoAuditChange {
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

function getMockAudit(): RepoAuditResult {
  const commits = mockDeployments.flatMap((deployment) =>
    deployment.commits.map((commit) =>
      classifyChange(
        {
          sha: commit.sha,
          message: commit.message,
          author: commit.author,
          committedAt: deployment.deployedAt,
          url: deployment.url,
        },
        commit.filesChanged,
      ),
    ),
  );

  return buildAuditResult(MOCK_REPO, commits, true, [
    "Demo mode uses deterministic commit metadata from mock deployment records.",
    "OpsPilot did not inspect live repository contents in demo mode.",
  ]);
}

async function fetchGitHubJson(url: string, token: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "OpsPilot",
      "x-github-api-version": GITHUB_API_VERSION,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });

  if (!response.ok) throw new GitHubAuditRequestError(response.status);
  return response.json() as Promise<unknown>;
}

function decodeContentPayload(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const encoding = optionalString(value.encoding);
  const content = optionalString(value.content);
  const size = typeof value.size === "number" ? value.size : Number.POSITIVE_INFINITY;
  if (encoding !== "base64" || !content || size > SMALL_FILE_LIMIT_BYTES) return null;

  try {
    return Buffer.from(content.replace(/\s+/g, ""), "base64").toString("utf8");
  } catch {
    return null;
  }
}

function extractContentSignals(file: string, content: string): string[] {
  const signals: string[] = [];
  if (/process\.env|import\.meta\.env|NEXT_PUBLIC_|SLACK_|GITHUB_|OPENAI_|DATABASE_URL/.test(content)) {
    signals.push(`${file} references environment variables or runtime secrets.`);
  }
  if (/oauth|token|secret|authorization|bearer/i.test(content)) {
    signals.push(`${file} contains auth, OAuth, token, or authorization logic.`);
  }
  if (/migration|alter table|create table|drop table/i.test(content)) {
    signals.push(`${file} contains database migration or schema operations.`);
  }
  return signals;
}

async function fetchSmallFileSignals(
  owner: string,
  repo: string,
  sha: string,
  file: string,
  token: string,
): Promise<string[]> {
  const encodedPath = file.split("/").map(encodeURIComponent).join("/");
  const payload = await fetchGitHubJson(
    `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(sha)}`,
    token,
  );
  const content = decodeContentPayload(payload);
  return content ? extractContentSignals(file, content) : [];
}

async function fetchCommitDetail(
  owner: string,
  repo: string,
  commit: CommitBase,
  token: string,
  remainingContentFetches: { count: number },
): Promise<CommitDetail> {
  const payload = await fetchGitHubJson(
    `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits/${encodeURIComponent(commit.sha)}`,
    token,
  );
  const filesChanged = extractFiles(payload);
  const contentSignals: string[] = [];

  for (const file of filesChanged.slice(0, 8)) {
    if (remainingContentFetches.count <= 0) break;
    if (!/\.(ts|tsx|js|jsx|json|sql|yml|yaml|env|toml|md)$/i.test(file)) continue;

    remainingContentFetches.count -= 1;
    try {
      contentSignals.push(...await fetchSmallFileSignals(owner, repo, commit.sha, file, token));
    } catch {
      // Commit metadata is still useful when a content fetch fails or the file is too large.
    }
  }

  return { sha: commit.sha, filesChanged, contentSignals };
}

async function fetchRealAudit(
  query: InvestigationQuery,
  config: NonNullable<Awaited<ReturnType<typeof getGitHubServiceConfig>>>,
): Promise<RepoAuditResult> {
  const owner = encodeURIComponent(config.repository.owner);
  const repo = encodeURIComponent(config.repository.name);
  const payload = await fetchGitHubJson(
    `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits?per_page=${COMMIT_LIMIT}`,
    config.token,
  );
  if (!Array.isArray(payload)) throw new Error("GitHub commit list response was invalid");

  const commits = payload.map(extractCommitBase).filter((commit) => commit !== null);
  const remainingContentFetches = { count: CONTENT_FETCH_LIMIT };
  const detailResults = await Promise.allSettled(
    commits.slice(0, DETAIL_LIMIT).map((commit) =>
      fetchCommitDetail(owner, repo, commit, config.token, remainingContentFetches),
    ),
  );
  const detailsBySha = new Map<string, CommitDetail>();

  for (const result of detailResults) {
    if (result.status === "fulfilled") {
      detailsBySha.set(result.value.sha, result.value);
    }
  }

  const changes = commits.map((commit) => {
    const detail = detailsBySha.get(commit.sha);
    const change = classifyChange(commit, detail?.filesChanged ?? []);
    return {
      ...change,
      contentSignals: [...new Set([...change.contentSignals, ...(detail?.contentSignals ?? [])])],
    };
  });

  const metadataOnly = changes.every((change) => change.contentSignals.length === 0);
  const limitations = [
    "This audit reviews recent commits and changed-file metadata, not the full repository.",
    "Runtime behavior, test results, secrets, and production telemetry were not verified.",
  ];
  if (metadataOnly) {
    limitations.push("No small changed-file contents were available or fetched, so findings are metadata-only.");
  }
  if (query.teamId) {
    limitations.push("Repository access used the workspace configuration when available, with server fallback if configured.");
  }

  return buildAuditResult(config.repository, changes, metadataOnly, limitations);
}

function buildAuditResult(
  repo: GitHubRepository,
  changes: RepoAuditChange[],
  metadataOnly: boolean,
  limitations: string[],
): RepoAuditResult {
  const sortedChanges = [...changes].sort(
    (left, right) => Date.parse(right.committedAt) - Date.parse(left.committedAt),
  );
  const highRiskChanges = sortedChanges.filter((change) => change.risk === "high");
  const mediumRiskChanges = sortedChanges.filter((change) => change.risk === "medium");
  const lowRiskChanges = sortedChanges.filter((change) => change.risk === "low");
  const configConcerns = sortedChanges
    .flatMap((change) => change.contentSignals.concat(change.reasons))
    .filter((signal) => /(config|dependency|environment|runtime|database|migration|schema)/i.test(signal));
  const securityConcerns = sortedChanges
    .flatMap((change) => change.contentSignals.concat(change.reasons))
    .filter((signal) => /(auth|oauth|token|secret|authorization|security|middleware|permission)/i.test(signal));
  const recommendedActions = [
    ...(highRiskChanges.length
      ? [
          "Review the highest-risk commits before the next deploy and identify owners for each risky path.",
          "Run targeted tests for API routes, auth/session behavior, database migrations, and checkout/payment flows touched by recent changes.",
        ]
      : []),
    ...(configConcerns.length
      ? ["Validate configuration, environment variable, and dependency changes in staging before production rollout."]
      : []),
    ...(securityConcerns.length
      ? ["Perform a focused security review for auth, OAuth, token handling, and middleware changes."]
      : []),
    "Compare this review with CI results, deployment status, and production telemetry before taking action.",
  ];
  const confidenceScore = Math.max(
    0.45,
    Math.min(0.86, 0.62 + (sortedChanges.length > 0 ? 0.08 : 0) + (metadataOnly ? 0 : 0.1)),
  );
  const summary =
    highRiskChanges.length > 0
      ? `OpsPilot reviewed ${sortedChanges.length} recent commits and found ${highRiskChanges.length} high-risk change${highRiskChanges.length === 1 ? "" : "s"} touching sensitive repository areas.`
      : mediumRiskChanges.length > 0
        ? `OpsPilot reviewed ${sortedChanges.length} recent commits and found medium-risk changes that should be validated before deployment.`
        : `OpsPilot reviewed ${sortedChanges.length} recent commits and did not find obvious high-risk file patterns.`;

  return {
    repo,
    scannedCommits: sortedChanges.length,
    highRiskChanges,
    mediumRiskChanges,
    lowRiskChanges,
    configConcerns: [...new Set(configConcerns)].slice(0, 6),
    securityConcerns: [...new Set(securityConcerns)].slice(0, 6),
    recommendedActions: [...new Set(recommendedActions)].slice(0, 6),
    summary,
    confidenceScore,
    metadataOnly,
    limitations,
  };
}

export class RepoAuditTool implements IncidentTool<RepoAuditResult> {
  readonly name = "repo_audit";

  async execute(query: InvestigationQuery): Promise<RepoAuditResult> {
    if (isDemoMode()) {
      logger.info("RepoAuditTool using mock repository audit", { reason: "demo_mode" });
      return getMockAudit();
    }

    const config = await getGitHubServiceConfig(query.teamId);
    if (!config) {
      logger.info("RepoAuditTool using mock repository audit", { reason: "missing_configuration" });
      return getMockAudit();
    }

    try {
      return await fetchRealAudit(query, config);
    } catch (error) {
      const metadata: Record<string, unknown> = {
        error: (error instanceof Error ? error.message : String(error)).slice(0, 200),
      };
      if (error instanceof GitHubAuditRequestError) metadata.status = error.status;
      logger.warn("GitHub repository audit failed; using mock audit", metadata);
      return getMockAudit();
    }
  }
}

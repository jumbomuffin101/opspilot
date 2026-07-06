import { mockDeployments } from "@/src/data/mockDeployments";
import { logger } from "@/src/lib/logger";
import { isDemoMode } from "@/src/lib/utils";
import { getGitHubServiceConfig } from "@/src/services/github";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { CommitSignal, GitHubToolResult } from "@/src/types/tools";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_TIMEOUT_MS = 8_000;
const COMMIT_LIMIT = 10;
const DETAIL_LIMIT = 3;
const CHECKOUT_RELEVANCE_TERMS = [
  "checkout",
  "payment",
  "payments",
  "order",
  "orders",
  "api",
  "auth",
  "middleware",
];
const IGNORED_QUERY_TERMS = new Set([
  "after",
  "before",
  "failing",
  "failure",
  "from",
  "http",
  "into",
  "latest",
  "returning",
  "the",
  "with",
]);

interface GitHubCommitBase {
  sha: string;
  message: string;
  author: string;
  committedAt: string;
  url?: string;
}

class GitHubRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly rateLimitRemaining?: string,
  ) {
    super(`GitHub request failed with status ${status}`);
    this.name = "GitHubRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const nested = value[key];
  return isRecord(nested) ? nested : null;
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractCommitBase(value: unknown): GitHubCommitBase | null {
  if (!isRecord(value)) return null;
  const commit = getNestedRecord(value, "commit");
  if (!commit) return null;
  const commitAuthor = getNestedRecord(commit, "author");
  const commitCommitter = getNestedRecord(commit, "committer");
  const apiAuthor = getNestedRecord(value, "author");
  const sha = getOptionalString(value.sha);
  const message = getOptionalString(commit.message);
  const committedAt =
    getOptionalString(commitAuthor?.date) ?? getOptionalString(commitCommitter?.date);

  if (!sha || !message || !committedAt || !Number.isFinite(Date.parse(committedAt))) {
    return null;
  }

  return {
    sha,
    message,
    author:
      getOptionalString(apiAuthor?.login) ??
      getOptionalString(commitAuthor?.name) ??
      getOptionalString(commitCommitter?.name) ??
      "Unknown author",
    committedAt,
    url: getOptionalString(value.html_url),
  };
}

function extractChangedFiles(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.files)) return [];

  return value.files
    .map((file) => (isRecord(file) ? getOptionalString(file.filename) : undefined))
    .filter((filename): filename is string => Boolean(filename));
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !IGNORED_QUERY_TERMS.has(term));
}

function getRelevanceTerms(query: InvestigationQuery): string[] {
  const terms = new Set([...tokenize(query.issue), ...tokenize(query.service ?? "")]);
  if (terms.has("checkout")) {
    for (const term of CHECKOUT_RELEVANCE_TERMS) terms.add(term);
  }

  return [...terms];
}

function calculateRelevance(
  query: InvestigationQuery,
  message: string,
  filesChanged: readonly string[],
): { relevanceScore: number; matchedTerms: string[] } {
  const terms = getRelevanceTerms(query);
  const corpus = `${message} ${filesChanged.join(" ")}`.toLowerCase();
  const matchedTerms = terms.filter((term) => corpus.includes(term));
  let points = matchedTerms.length;

  if (query.service && corpus.includes(query.service.toLowerCase())) points += 3;
  if (filesChanged.some((file) => file.toLowerCase().includes(query.service ?? ""))) {
    points += query.service ? 2 : 0;
  }

  return {
    relevanceScore: Math.min(1, Number((points / 6).toFixed(2))),
    matchedTerms,
  };
}

function riskFromRelevance(relevanceScore: number): CommitSignal["risk"] {
  if (relevanceScore >= 0.65) return "high";
  if (relevanceScore >= 0.3) return "medium";
  return "low";
}

function rankCommits(commits: CommitSignal[]): CommitSignal[] {
  return commits.sort(
    (left, right) =>
      right.relevanceScore - left.relevanceScore ||
      Date.parse(right.committedAt) - Date.parse(left.committedAt),
  );
}

function getMockCommits(query: InvestigationQuery): CommitSignal[] {
  const commits = mockDeployments
    .filter(
      (deployment) => !query.service || deployment.repository.name === query.service,
    )
    .flatMap((deployment) =>
      deployment.commits.map((commit) => {
        const relevance = calculateRelevance(query, commit.message, commit.filesChanged);
        return {
          deploymentId: deployment.id,
          sha: commit.sha,
          message: commit.message,
          author: commit.author,
          risk: commit.risk,
          filesChanged: [...commit.filesChanged],
          committedAt: deployment.deployedAt,
          url: deployment.url,
          ...relevance,
        };
      }),
    );

  return rankCommits(commits);
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

  if (!response.ok) {
    throw new GitHubRequestError(
      response.status,
      response.headers.get("x-ratelimit-remaining") ?? undefined,
    );
  }

  return response.json() as Promise<unknown>;
}

async function fetchRealCommits(query: InvestigationQuery): Promise<CommitSignal[]> {
  const config = getGitHubServiceConfig();
  if (!config) return [];
  const owner = encodeURIComponent(config.repository.owner);
  const repo = encodeURIComponent(config.repository.name);
  const listUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits?per_page=${COMMIT_LIMIT}`;
  const listPayload = await fetchGitHubJson(listUrl, config.token);

  if (!Array.isArray(listPayload)) throw new Error("GitHub commit list response was invalid");
  const baseCommits = listPayload.map(extractCommitBase).filter((commit) => commit !== null);
  if (baseCommits.length === 0) throw new Error("GitHub returned no usable commits");

  const detailResults = await Promise.allSettled(
    baseCommits.slice(0, DETAIL_LIMIT).map(async (commit) => ({
      sha: commit.sha,
      payload: await fetchGitHubJson(
        `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits/${encodeURIComponent(commit.sha)}`,
        config.token,
      ),
    })),
  );
  const filesBySha = new Map<string, string[]>();
  let failedDetailRequests = 0;

  for (const result of detailResults) {
    if (result.status === "fulfilled") {
      filesBySha.set(result.value.sha, extractChangedFiles(result.value.payload));
    } else {
      failedDetailRequests += 1;
    }
  }

  if (failedDetailRequests > 0) {
    logger.warn("Some GitHub commit detail requests failed; basic commit data retained", {
      failedDetailRequests,
    });
  }

  return rankCommits(
    baseCommits.map((commit) => {
      const filesChanged = filesBySha.get(commit.sha) ?? [];
      const relevance = calculateRelevance(query, commit.message, filesChanged);
      return {
        deploymentId: `github:${commit.sha}`,
        ...commit,
        filesChanged,
        risk: riskFromRelevance(relevance.relevanceScore),
        ...relevance,
      };
    }),
  );
}

function shouldUseMockGitHub(): { useMock: boolean; reason?: string } {
  if (isDemoMode()) {
    return { useMock: true, reason: "demo_mode" };
  }

  if (!getGitHubServiceConfig()) return { useMock: true, reason: "missing_configuration" };
  return { useMock: false };
}

export class GitHubTool implements IncidentTool<GitHubToolResult> {
  readonly name = "github";

  async execute(query: InvestigationQuery): Promise<GitHubToolResult> {
    const mode = shouldUseMockGitHub();
    if (mode.useMock) {
      logger.info("GitHubTool using mock commit signals", { reason: mode.reason });
      return { kind: "commits", commits: getMockCommits(query) };
    }

    try {
      return { kind: "commits", commits: await fetchRealCommits(query) };
    } catch (error) {
      const metadata: Record<string, unknown> = {
        error: (error instanceof Error ? error.message : String(error)).slice(0, 200),
      };
      if (error instanceof GitHubRequestError) {
        metadata.status = error.status;
        metadata.rateLimited =
          error.status === 429 ||
          (error.status === 403 && error.rateLimitRemaining === "0");
      }
      logger.warn("GitHub API unavailable; using mock commit signals", metadata);
      return { kind: "commits", commits: getMockCommits(query) };
    }
  }
}

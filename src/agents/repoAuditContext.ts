import type { RepoAuditResult } from "@/src/types/tools";

export interface RepoAuditContext {
  teamId: string;
  channelId: string;
  threadTs?: string;
  requesterId?: string;
  requestText: string;
  audit: RepoAuditResult;
  createdAt: string;
  expiresAt: string;
}

interface RepoAuditContextGlobal {
  __opsPilotRepoAuditContexts?: Map<string, RepoAuditContext>;
}

const CONTEXT_TTL_MS = 12 * 60 * 60 * 1_000;
const runtimeGlobal = globalThis as typeof globalThis & RepoAuditContextGlobal;
const contexts = runtimeGlobal.__opsPilotRepoAuditContexts ?? new Map<string, RepoAuditContext>();
runtimeGlobal.__opsPilotRepoAuditContexts = contexts;

function contextKey(teamId: string, channelId: string, threadTs?: string): string {
  return `${teamId}:${channelId}:${threadTs ?? "latest"}`;
}

function isExpired(context: RepoAuditContext): boolean {
  return Date.now() > Date.parse(context.expiresAt);
}

function pruneExpiredContexts(): void {
  for (const [key, context] of contexts) {
    if (isExpired(context)) contexts.delete(key);
  }
}

export async function saveRepoAuditContext(
  context: Omit<RepoAuditContext, "createdAt" | "expiresAt">,
): Promise<RepoAuditContext> {
  pruneExpiredContexts();
  const createdAt = new Date().toISOString();
  const savedContext: RepoAuditContext = {
    ...context,
    createdAt,
    expiresAt: new Date(Date.now() + CONTEXT_TTL_MS).toISOString(),
  };

  contexts.set(contextKey(context.teamId, context.channelId, context.threadTs), savedContext);
  contexts.set(contextKey(context.teamId, context.channelId), savedContext);
  return savedContext;
}

export async function getLatestRepoAuditContext(
  teamId: string,
  channelId: string,
  threadTs?: string,
): Promise<RepoAuditContext | null> {
  pruneExpiredContexts();
  const context =
    (threadTs ? contexts.get(contextKey(teamId, channelId, threadTs)) : undefined) ??
    contexts.get(contextKey(teamId, channelId));

  return context && !isExpired(context) ? context : null;
}

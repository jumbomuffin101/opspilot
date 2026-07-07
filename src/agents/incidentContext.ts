import { logger } from "@/src/lib/logger";
import type {
  IncidentContext,
  IncidentInvestigation,
  IncidentStatus,
} from "@/src/types/incident";

export const INCIDENT_CONTEXT_TTL_MS = 12 * 60 * 60 * 1_000;
const MAX_CONTEXTS = 100;

interface IncidentContextStoreGlobal {
  __opsPilotIncidentContexts?: Map<string, IncidentContext>;
}

const runtimeGlobal = globalThis as typeof globalThis & IncidentContextStoreGlobal;
const contexts =
  runtimeGlobal.__opsPilotIncidentContexts ?? new Map<string, IncidentContext>();
runtimeGlobal.__opsPilotIncidentContexts = contexts;

function contextKey(teamId: string, channelId: string, threadTs?: string): string {
  return `${teamId}:${channelId}:${threadTs ?? "channel"}`;
}

function removeExpiredContexts(now = Date.now()): void {
  for (const [key, context] of contexts) {
    if (now - Date.parse(context.updatedAt) > INCIDENT_CONTEXT_TTL_MS) {
      contexts.delete(key);
    }
  }
}

function enforceCapacity(): void {
  if (contexts.size <= MAX_CONTEXTS) return;

  const oldest = [...contexts.entries()].sort(
    ([, left], [, right]) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt),
  );
  for (const [key] of oldest.slice(0, contexts.size - MAX_CONTEXTS)) contexts.delete(key);
}

function contextsForChannel(teamId: string, channelId: string): IncidentContext[] {
  removeExpiredContexts();
  return [...contexts.values()]
    .filter((context) => context.teamId === teamId && context.channelId === channelId)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export interface SetIncidentContextInput {
  teamId: string;
  channelId: string;
  threadTs?: string;
  requesterId: string;
  issueText: string;
  investigation: IncidentInvestigation;
}

export function setActiveIncidentContext(input: SetIncidentContextInput): IncidentContext {
  const key = contextKey(input.teamId, input.channelId, input.threadTs);
  const existing = contexts.get(key);
  const now = new Date().toISOString();
  const context: IncidentContext = {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  contexts.set(key, context);
  removeExpiredContexts();
  enforceCapacity();
  logger.info("Active incident context stored in memory", {
    teamId: input.teamId,
    channelId: input.channelId,
    incidentId: input.investigation.id,
  });

  return context;
}

export function getActiveIncidentContext(
  teamId: string,
  channelId: string,
  threadTs?: string,
): IncidentContext | null {
  removeExpiredContexts();
  if (threadTs) {
    const context = contexts.get(contextKey(teamId, channelId, threadTs));
    if (context) return context;
  }

  return contextsForChannel(teamId, channelId)[0] ?? null;
}

export function updateActiveIncidentStatus(
  teamId: string,
  channelId: string,
  status: IncidentStatus,
  incidentId?: string,
  threadTs?: string,
): IncidentContext | null {
  const context =
    (threadTs ? getActiveIncidentContext(teamId, channelId, threadTs) : null) ??
    contextsForChannel(teamId, channelId).find((candidate) =>
      incidentId ? candidate.investigation.id === incidentId : true,
    ) ??
    null;
  if (!context) return null;

  return setActiveIncidentContext({
    ...context,
    investigation: {
      ...context.investigation,
      status,
      ...(status === "resolved"
        ? {
            statusUpdate: `Resolved: ${context.investigation.postmortemDraft.resolution}`,
          }
        : {}),
    },
  });
}

export function listActiveIncidentContexts(limit = 20): IncidentContext[] {
  removeExpiredContexts();
  return [...contexts.values()]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, Math.max(0, limit));
}

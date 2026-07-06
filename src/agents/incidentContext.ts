import { logger } from "@/src/lib/logger";
import type {
  IncidentContext,
  IncidentInvestigation,
  IncidentStatus,
} from "@/src/types/incident";

const CONTEXT_TTL_MS = 12 * 60 * 60 * 1_000;
const MAX_CONTEXTS = 100;

interface IncidentContextStoreGlobal {
  __opsPilotIncidentContexts?: Map<string, IncidentContext>;
}

const runtimeGlobal = globalThis as typeof globalThis & IncidentContextStoreGlobal;
const contexts =
  runtimeGlobal.__opsPilotIncidentContexts ?? new Map<string, IncidentContext>();
runtimeGlobal.__opsPilotIncidentContexts = contexts;

function contextKey(teamId: string, channelId: string): string {
  return `${teamId}:${channelId}`;
}

function removeExpiredContexts(now = Date.now()): void {
  for (const [key, context] of contexts) {
    if (now - Date.parse(context.updatedAt) > CONTEXT_TTL_MS) contexts.delete(key);
  }
}

function enforceCapacity(): void {
  if (contexts.size <= MAX_CONTEXTS) return;

  const oldest = [...contexts.entries()].sort(
    ([, left], [, right]) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt),
  );
  for (const [key] of oldest.slice(0, contexts.size - MAX_CONTEXTS)) contexts.delete(key);
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
  const key = contextKey(input.teamId, input.channelId);
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
  logger.info("Active incident context stored", {
    teamId: input.teamId,
    channelId: input.channelId,
    incidentId: input.investigation.id,
  });

  return context;
}

export function getActiveIncidentContext(
  teamId: string,
  channelId: string,
): IncidentContext | null {
  removeExpiredContexts();
  return contexts.get(contextKey(teamId, channelId)) ?? null;
}

export function updateActiveIncidentStatus(
  teamId: string,
  channelId: string,
  status: IncidentStatus,
): IncidentContext | null {
  const context = getActiveIncidentContext(teamId, channelId);
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

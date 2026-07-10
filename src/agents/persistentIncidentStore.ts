import { randomUUID } from "node:crypto";

import {
  getActiveIncidentContext,
  INCIDENT_CONTEXT_TTL_MS,
  listActiveIncidentContexts,
  setActiveIncidentContext,
  updateActiveIncidentStatus,
} from "@/src/agents/incidentContext";
import {
  checkDatabaseStatus,
  getDatabasePool,
  getLastDatabaseStatus,
  isPersistentDatabaseConfigured,
} from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { validateIncidentInvestigation } from "@/src/lib/validation";
import type {
  IncidentContext,
  IncidentMemorySummary,
  IncidentStatus,
} from "@/src/types/incident";

interface IncidentRow {
  incident_id: string;
  workspace_id: string;
  channel_id: string;
  thread_ts: string | null;
  title: string;
  service: string;
  severity: string;
  status: string;
  summary: string;
  investigation_json: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

type IncidentMemoryMode = "persistent" | "in-memory";

function isoTimestamp(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function expiresAt(updatedAt: string): string {
  return new Date(Date.parse(updatedAt) + INCIDENT_CONTEXT_TTL_MS).toISOString();
}

function toContext(row: IncidentRow): IncidentContext | null {
  const investigation = validateIncidentInvestigation(row.investigation_json);
  if (!investigation) {
    logger.warn("Skipped incident memory row with invalid investigation JSON", {
      incidentId: row.incident_id,
    });
    return null;
  }

  return {
    teamId: row.workspace_id,
    channelId: row.channel_id,
    ...(row.thread_ts ? { threadTs: row.thread_ts } : {}),
    requesterId: investigation.suggestedOwners[0]?.slackUserId ?? "unknown",
    issueText: investigation.title,
    investigation,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

function toSummary(context: IncidentContext): IncidentMemorySummary {
  return {
    incidentId: context.investigation.id,
    title: context.investigation.title,
    service: context.investigation.service,
    severity: context.investigation.severity,
    status: context.investigation.status,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
  };
}

function fallbackContext(
  workspaceId: string,
  channelId: string,
  threadTs?: string,
): IncidentContext | null {
  return getActiveIncidentContext(workspaceId, channelId, threadTs);
}

async function queryContext(
  workspaceId: string,
  channelId: string,
  threadTs?: string,
): Promise<IncidentContext | null> {
  const db = getDatabasePool();
  if (!db) return null;

  const params = threadTs ? [workspaceId, channelId, threadTs] : [workspaceId, channelId];
  const threadClause = threadTs ? "AND thread_ts = $3" : "";
  const result = await db.query<IncidentRow>(
    `
      SELECT
        incident_id,
        workspace_id,
        channel_id,
        thread_ts,
        title,
        service,
        severity,
        status,
        summary,
        investigation_json,
        created_at,
        updated_at
      FROM incidents
      WHERE workspace_id = $1
        AND channel_id = $2
        ${threadClause}
        AND expires_at > NOW()
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    params,
  );

  const row = result.rows[0];
  return row ? toContext(row) : null;
}

async function queryContextByIncidentId(
  workspaceId: string,
  channelId: string,
  incidentId: string,
): Promise<IncidentContext | null> {
  const db = getDatabasePool();
  if (!db) return null;

  const result = await db.query<IncidentRow>(
    `
      SELECT
        incident_id,
        workspace_id,
        channel_id,
        thread_ts,
        title,
        service,
        severity,
        status,
        summary,
        investigation_json,
        created_at,
        updated_at
      FROM incidents
      WHERE workspace_id = $1
        AND channel_id = $2
        AND incident_id = $3
        AND expires_at > NOW()
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [workspaceId, channelId, incidentId],
  );

  const row = result.rows[0];
  return row ? toContext(row) : null;
}

export function getIncidentMemoryMode(): IncidentMemoryMode {
  return isPersistentDatabaseConfigured() && getLastDatabaseStatus() !== "error"
    ? "persistent"
    : "in-memory";
}

export { checkDatabaseStatus };

export async function saveIncidentContext(
  context: Omit<IncidentContext, "createdAt" | "updatedAt"> &
    Partial<Pick<IncidentContext, "createdAt" | "updatedAt">>,
): Promise<IncidentContext> {
  const memoryContext = setActiveIncidentContext({
    teamId: context.teamId,
    channelId: context.channelId,
    threadTs: context.threadTs,
    requesterId: context.requesterId,
    issueText: context.issueText,
    investigation: context.investigation,
  });

  const db = getDatabasePool();
  if (!db) return memoryContext;

  const createdAt = context.createdAt ?? memoryContext.createdAt;
  const updatedAt = context.updatedAt ?? memoryContext.updatedAt;
  try {
    await db.query(
      `
        INSERT INTO incidents (
          id,
          incident_id,
          workspace_id,
          channel_id,
          thread_ts,
          title,
          service,
          severity,
          status,
          summary,
          investigation_json,
          created_at,
          updated_at,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14)
        ON CONFLICT (workspace_id, channel_id, incident_id)
        DO UPDATE SET
          thread_ts = EXCLUDED.thread_ts,
          title = EXCLUDED.title,
          service = EXCLUDED.service,
          severity = EXCLUDED.severity,
          status = EXCLUDED.status,
          summary = EXCLUDED.summary,
          investigation_json = EXCLUDED.investigation_json,
          updated_at = EXCLUDED.updated_at,
          expires_at = EXCLUDED.expires_at
      `,
      [
        randomUUID(),
        context.investigation.id,
        context.teamId,
        context.channelId,
        context.threadTs ?? null,
        context.investigation.title,
        context.investigation.service,
        context.investigation.severity,
        context.investigation.status,
        context.investigation.summary,
        JSON.stringify(context.investigation),
        createdAt,
        updatedAt,
        expiresAt(updatedAt),
      ],
    );
    logger.info("Active incident context persisted", {
      teamId: context.teamId,
      channelId: context.channelId,
      incidentId: context.investigation.id,
    });
  } catch (error) {
    logger.warn("Failed to persist incident context; using in-memory fallback", {
      incidentId: context.investigation.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return memoryContext;
}

export async function getIncidentContext(
  workspaceId: string,
  channelId: string,
  threadTs?: string,
): Promise<IncidentContext | null> {
  try {
    const persisted = await queryContext(workspaceId, channelId, threadTs);
    if (persisted) return persisted;
  } catch (error) {
    logger.warn("Failed to read incident context from database; using memory fallback", {
      workspaceId,
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return fallbackContext(workspaceId, channelId, threadTs);
}

export async function getLatestIncidentContext(
  workspaceId: string,
  channelId: string,
  threadTs?: string,
): Promise<IncidentContext | null> {
  return getIncidentContext(workspaceId, channelId, threadTs);
}

export async function updateIncidentStatus(
  workspaceId: string,
  channelId: string,
  incidentId: string,
  status: IncidentStatus,
): Promise<IncidentContext | null> {
  let context: IncidentContext | null = null;
  try {
    context = await queryContextByIncidentId(workspaceId, channelId, incidentId);
  } catch (error) {
    logger.warn("Failed to load incident before status update; using memory fallback", {
      incidentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  context ??= updateActiveIncidentStatus(workspaceId, channelId, status, incidentId);
  if (!context) return null;

  const updated: IncidentContext = {
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
  };

  return saveIncidentContext(updated);
}

export async function listRecentIncidents(limit = 20): Promise<IncidentMemorySummary[]> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const db = getDatabasePool();

  if (db) {
    try {
      const result = await db.query<{
        incident_id: string;
        title: string;
        service: string;
        severity: IncidentMemorySummary["severity"];
        status: IncidentMemorySummary["status"];
        created_at: Date | string;
        updated_at: Date | string;
      }>(
        `
          SELECT
            incident_id,
            title,
            service,
            severity,
            status,
            created_at,
            updated_at
          FROM incidents
          WHERE expires_at > NOW()
          ORDER BY updated_at DESC
          LIMIT $1
        `,
        [safeLimit],
      );

      return result.rows.map((row) => ({
        incidentId: row.incident_id,
        title: row.title,
        service: row.service,
        severity: row.severity,
        status: row.status,
        createdAt: isoTimestamp(row.created_at),
        updatedAt: isoTimestamp(row.updated_at),
      }));
    } catch (error) {
      logger.warn("Failed to list incidents from database; using memory fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return listActiveIncidentContexts(safeLimit).map(toSummary);
}

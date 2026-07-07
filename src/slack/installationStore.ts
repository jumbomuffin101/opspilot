import { randomUUID } from "node:crypto";

import { getDatabasePool } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";

export interface SlackInstallation {
  teamId: string;
  teamName: string;
  enterpriseId?: string;
  appId?: string;
  botUserId?: string;
  botAccessToken: string;
  scope: string;
  installedAt?: string;
  updatedAt?: string;
}

export interface SafeSlackInstallation {
  teamId: string;
  teamName: string;
  enterpriseId?: string;
  appId?: string;
  botUserId?: string;
  scope: string;
  installedAt: string;
  updatedAt: string;
}

interface SlackInstallationRow {
  team_id: string;
  team_name: string;
  enterprise_id: string | null;
  app_id: string | null;
  bot_user_id: string | null;
  bot_access_token: string;
  scope: string;
  installed_at: Date | string;
  updated_at: Date | string;
}

function isoTimestamp(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function toInstallation(row: SlackInstallationRow): SlackInstallation {
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    ...(row.enterprise_id ? { enterpriseId: row.enterprise_id } : {}),
    ...(row.app_id ? { appId: row.app_id } : {}),
    ...(row.bot_user_id ? { botUserId: row.bot_user_id } : {}),
    botAccessToken: row.bot_access_token,
    scope: row.scope,
    installedAt: isoTimestamp(row.installed_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

function toSafeInstallation(row: SlackInstallationRow): SafeSlackInstallation {
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    ...(row.enterprise_id ? { enterpriseId: row.enterprise_id } : {}),
    ...(row.app_id ? { appId: row.app_id } : {}),
    ...(row.bot_user_id ? { botUserId: row.bot_user_id } : {}),
    scope: row.scope,
    installedAt: isoTimestamp(row.installed_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

export async function saveInstallation(installation: SlackInstallation): Promise<boolean> {
  const db = getDatabasePool();
  if (!db) {
    logger.warn("Slack installation was not saved because DATABASE_URL is not configured", {
      teamId: installation.teamId,
    });
    return false;
  }

  try {
    await db.query(
      `
        INSERT INTO slack_installations (
          id,
          team_id,
          team_name,
          enterprise_id,
          app_id,
          bot_user_id,
          bot_access_token,
          scope,
          installed_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (team_id)
        DO UPDATE SET
          team_name = EXCLUDED.team_name,
          enterprise_id = EXCLUDED.enterprise_id,
          app_id = EXCLUDED.app_id,
          bot_user_id = EXCLUDED.bot_user_id,
          bot_access_token = EXCLUDED.bot_access_token,
          scope = EXCLUDED.scope,
          updated_at = NOW()
      `,
      [
        randomUUID(),
        installation.teamId,
        installation.teamName,
        installation.enterpriseId ?? null,
        installation.appId ?? null,
        installation.botUserId ?? null,
        installation.botAccessToken,
        installation.scope,
      ],
    );
    logger.info("Slack workspace installation saved", { teamId: installation.teamId });
    return true;
  } catch (error) {
    logger.error("Failed to save Slack installation", {
      teamId: installation.teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function getInstallationByTeam(
  teamId: string,
): Promise<SlackInstallation | null> {
  const db = getDatabasePool();
  if (!db) return null;

  try {
    const result = await db.query<SlackInstallationRow>(
      `
        SELECT
          team_id,
          team_name,
          enterprise_id,
          app_id,
          bot_user_id,
          bot_access_token,
          scope,
          installed_at,
          updated_at
        FROM slack_installations
        WHERE team_id = $1
        LIMIT 1
      `,
      [teamId],
    );
    const row = result.rows[0];
    return row ? toInstallation(row) : null;
  } catch (error) {
    logger.warn("Failed to read Slack installation", {
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function listInstallationsSafe(
  limit = 50,
): Promise<SafeSlackInstallation[]> {
  const db = getDatabasePool();
  if (!db) return [];

  try {
    const result = await db.query<SlackInstallationRow>(
      `
        SELECT
          team_id,
          team_name,
          enterprise_id,
          app_id,
          bot_user_id,
          bot_access_token,
          scope,
          installed_at,
          updated_at
        FROM slack_installations
        ORDER BY updated_at DESC
        LIMIT $1
      `,
      [Math.min(100, Math.max(1, limit))],
    );

    return result.rows.map(toSafeInstallation);
  } catch (error) {
    logger.warn("Failed to list Slack installations", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

import { randomUUID } from "node:crypto";

import { getDatabasePool } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";

export interface GitHubInstallation {
  teamId: string;
  githubUserLogin: string;
  githubAccessToken: string;
  scope: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GitHubInstallationRow {
  team_id: string;
  github_user_login: string;
  github_access_token: string;
  scope: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function isoTimestamp(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function toInstallation(row: GitHubInstallationRow): GitHubInstallation {
  return {
    teamId: row.team_id,
    githubUserLogin: row.github_user_login,
    githubAccessToken: row.github_access_token,
    scope: row.scope,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

export async function saveGitHubInstallation(
  installation: GitHubInstallation,
): Promise<boolean> {
  const db = getDatabasePool();
  if (!db) {
    logger.warn("GitHub installation was not saved because DATABASE_URL is not configured", {
      teamId: installation.teamId,
    });
    return false;
  }

  try {
    await db.query(
      `
        INSERT INTO github_installations (
          id,
          team_id,
          github_user_login,
          github_access_token,
          scope,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (team_id)
        DO UPDATE SET
          github_user_login = EXCLUDED.github_user_login,
          github_access_token = EXCLUDED.github_access_token,
          scope = EXCLUDED.scope,
          updated_at = NOW()
      `,
      [
        randomUUID(),
        installation.teamId,
        installation.githubUserLogin,
        installation.githubAccessToken,
        installation.scope,
      ],
    );
    logger.info("GitHub installation saved", { teamId: installation.teamId });
    return true;
  } catch (error) {
    logger.error("Failed to save GitHub installation", {
      teamId: installation.teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function getGitHubInstallationByTeam(
  teamId: string,
): Promise<GitHubInstallation | null> {
  const db = getDatabasePool();
  if (!db) return null;

  try {
    const result = await db.query<GitHubInstallationRow>(
      `
        SELECT
          team_id,
          github_user_login,
          github_access_token,
          scope,
          created_at,
          updated_at
        FROM github_installations
        WHERE team_id = $1
        LIMIT 1
      `,
      [teamId],
    );

    const row = result.rows[0];
    return row ? toInstallation(row) : null;
  } catch (error) {
    logger.warn("Failed to read GitHub installation", {
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function hasGitHubInstallation(teamId: string): Promise<boolean> {
  const db = getDatabasePool();
  if (!db) return false;

  try {
    const result = await db.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM github_installations WHERE team_id = $1) AS exists",
      [teamId],
    );
    return Boolean(result.rows[0]?.exists);
  } catch (error) {
    logger.warn("Failed to check GitHub installation", {
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

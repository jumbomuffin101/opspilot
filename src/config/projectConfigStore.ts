import { randomUUID } from "node:crypto";

import {
  normalizeDeploymentProvider,
  normalizeServicePaths,
  type DeploymentProvider,
  type ServicePathMapping,
} from "@/src/config/projectConfigValidation";
import { getDatabasePool } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";

export { normalizeDeploymentProvider, normalizeServicePaths };
export type { DeploymentProvider, ServicePathMapping };

export interface ProjectConfig {
  teamId: string;
  workspaceName?: string;
  githubOwner: string;
  githubRepo: string;
  defaultService?: string;
  servicePaths: ServicePathMapping;
  deploymentProvider: DeploymentProvider;
  createdAt?: string;
  updatedAt?: string;
}

export type SafeProjectConfig = Omit<ProjectConfig, "servicePaths"> & {
  servicePaths: ServicePathMapping;
  configured: true;
};

interface ProjectConfigRow {
  team_id: string;
  workspace_name: string | null;
  github_owner: string;
  github_repo: string;
  default_service: string | null;
  service_paths_json: unknown;
  deployment_provider: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function isoTimestamp(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function toProjectConfig(row: ProjectConfigRow): ProjectConfig | null {
  const servicePaths = normalizeServicePaths(row.service_paths_json);
  const deploymentProvider = normalizeDeploymentProvider(row.deployment_provider);
  if (!servicePaths || !deploymentProvider) return null;

  return {
    teamId: row.team_id,
    ...(row.workspace_name ? { workspaceName: row.workspace_name } : {}),
    githubOwner: row.github_owner,
    githubRepo: row.github_repo,
    ...(row.default_service ? { defaultService: row.default_service } : {}),
    servicePaths,
    deploymentProvider,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

function toSafeProjectConfig(config: ProjectConfig): SafeProjectConfig {
  return {
    ...config,
    configured: true,
  };
}

export async function saveProjectConfig(config: ProjectConfig): Promise<boolean> {
  const db = getDatabasePool();
  if (!db) {
    logger.warn("Project config was not saved because DATABASE_URL is not configured", {
      teamId: config.teamId,
    });
    return false;
  }

  try {
    await db.query(
      `
        INSERT INTO project_configs (
          id,
          team_id,
          workspace_name,
          github_owner,
          github_repo,
          default_service,
          service_paths_json,
          deployment_provider,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW(), NOW())
        ON CONFLICT (team_id)
        DO UPDATE SET
          workspace_name = EXCLUDED.workspace_name,
          github_owner = EXCLUDED.github_owner,
          github_repo = EXCLUDED.github_repo,
          default_service = EXCLUDED.default_service,
          service_paths_json = EXCLUDED.service_paths_json,
          deployment_provider = EXCLUDED.deployment_provider,
          updated_at = NOW()
      `,
      [
        randomUUID(),
        config.teamId,
        config.workspaceName ?? null,
        config.githubOwner,
        config.githubRepo,
        config.defaultService ?? null,
        JSON.stringify(config.servicePaths),
        config.deploymentProvider,
      ],
    );
    logger.info("Project config saved", { teamId: config.teamId });
    return true;
  } catch (error) {
    logger.error("Failed to save project config", {
      teamId: config.teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function getProjectConfigByTeam(
  teamId: string,
): Promise<ProjectConfig | null> {
  const db = getDatabasePool();
  if (!db) return null;

  try {
    const result = await db.query<ProjectConfigRow>(
      `
        SELECT
          team_id,
          workspace_name,
          github_owner,
          github_repo,
          default_service,
          service_paths_json,
          deployment_provider,
          created_at,
          updated_at
        FROM project_configs
        WHERE team_id = $1
        LIMIT 1
      `,
      [teamId],
    );

    const row = result.rows[0];
    return row ? toProjectConfig(row) : null;
  } catch (error) {
    logger.warn("Failed to read project config", {
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getSafeProjectConfigByTeam(
  teamId: string,
): Promise<SafeProjectConfig | null> {
  const config = await getProjectConfigByTeam(teamId);
  return config ? toSafeProjectConfig(config) : null;
}

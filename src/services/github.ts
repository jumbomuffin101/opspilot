import { ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { getProjectConfigByTeam } from "@/src/config/projectConfigStore";
import { getGitHubInstallationByTeam } from "@/src/github/githubInstallationStore";
import type { GitHubRepository } from "@/src/types/github";

export interface GitHubServiceConfig {
  token: string;
  repository: GitHubRepository;
}

function getGitHubToken(): string | null {
  const token = process.env[ENVIRONMENT_KEYS.githubToken];
  return token?.trim() || null;
}

function getEnvRepository(): GitHubRepository | null {
  const owner = process.env[ENVIRONMENT_KEYS.githubOwner];
  const name = process.env[ENVIRONMENT_KEYS.githubRepo];
  return owner && name ? { owner, name } : null;
}

async function getWorkspaceGitHubToken(teamId?: string): Promise<string | null> {
  if (!teamId) return null;

  const installation = await getGitHubInstallationByTeam(teamId);
  return installation?.githubAccessToken ?? null;
}

async function getWorkspaceRepository(teamId?: string): Promise<GitHubRepository | null> {
  if (!teamId) return null;

  const projectConfig = await getProjectConfigByTeam(teamId);
  if (!projectConfig) return null;

  return {
    owner: projectConfig.githubOwner,
    name: projectConfig.githubRepo,
  };
}

/** Returns runtime configuration without creating a network client at module scope. */
export async function getGitHubServiceConfig(
  teamId?: string,
): Promise<GitHubServiceConfig | null> {
  const [workspaceToken, workspaceRepository] = await Promise.all([
    getWorkspaceGitHubToken(teamId),
    getWorkspaceRepository(teamId),
  ]);
  const token = workspaceToken ?? getGitHubToken();
  const repository = workspaceRepository ?? getEnvRepository();

  return token && repository ? { token, repository } : null;
}

import { ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { getProjectConfigByTeam } from "@/src/config/projectConfigStore";
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

/** Returns runtime configuration without creating a network client at module scope. */
export async function getGitHubServiceConfig(
  teamId?: string,
): Promise<GitHubServiceConfig | null> {
  const token = getGitHubToken();
  if (!token) return null;

  if (teamId) {
    const projectConfig = await getProjectConfigByTeam(teamId);
    if (projectConfig) {
      return {
        token,
        repository: {
          owner: projectConfig.githubOwner,
          name: projectConfig.githubRepo,
        },
      };
    }
  }

  const repository = getEnvRepository();
  return repository ? { token, repository } : null;
}

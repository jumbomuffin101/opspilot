import { ENVIRONMENT_KEYS } from "@/src/lib/constants";
import type { GitHubRepository } from "@/src/types/github";

export interface GitHubServiceConfig {
  token: string;
  repository: GitHubRepository;
}

/** Returns runtime configuration without creating a network client at module scope. */
export function getGitHubServiceConfig(): GitHubServiceConfig | null {
  const token = process.env[ENVIRONMENT_KEYS.githubToken];
  const owner = process.env[ENVIRONMENT_KEYS.githubOwner];
  const name = process.env[ENVIRONMENT_KEYS.githubRepo];

  return token && owner && name ? { token, repository: { owner, name } } : null;
}

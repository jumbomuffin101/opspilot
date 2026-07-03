export type DeploymentStatus = "success" | "failure" | "in_progress" | "rolled_back";

export interface GitHubRepository {
  owner: string;
  name: string;
}

export interface DeploymentRecord {
  id: string;
  repository: GitHubRepository;
  environment: string;
  status: DeploymentStatus;
  sha: string;
  branch: string;
  author: string;
  summary: string;
  deployedAt: string;
  completedAt?: string;
  url?: string;
}

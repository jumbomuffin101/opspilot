import { mockDeployments } from "@/src/data/mockDeployments";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { GitHubToolResult } from "@/src/types/tools";

export class GitHubTool implements IncidentTool<GitHubToolResult> {
  readonly name = "github";

  async execute(query: InvestigationQuery): Promise<GitHubToolResult> {
    const commits = mockDeployments
      .filter(
        (deployment) => !query.service || deployment.repository.name === query.service,
      )
      .flatMap((deployment) =>
        deployment.commits.map((commit) => ({
          deploymentId: deployment.id,
          sha: commit.sha,
          message: commit.message,
          author: commit.author,
          risk: commit.risk,
          filesChanged: [...commit.filesChanged],
          committedAt: deployment.deployedAt,
          url: deployment.url,
        })),
      );

    return { kind: "commits", commits };
  }
}

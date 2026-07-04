import { mockDeployments } from "@/src/data/mockDeployments";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { DeploymentToolResult } from "@/src/types/tools";

export class DeploymentTool implements IncidentTool<DeploymentToolResult> {
  readonly name = "deployments";

  async execute(query: InvestigationQuery): Promise<DeploymentToolResult> {
    const deployments = mockDeployments
      .filter(
        (deployment) => !query.service || deployment.repository.name === query.service,
      )
      .map((deployment) => ({
        id: deployment.id,
        service: deployment.repository.name,
        environment: deployment.environment,
        version: deployment.version,
        status: deployment.status,
        sha: deployment.sha,
        summary: deployment.summary,
        deployedAt: deployment.deployedAt,
        completedAt: deployment.completedAt,
        url: deployment.url,
      }));

    return { kind: "deployments", deployments };
  }
}

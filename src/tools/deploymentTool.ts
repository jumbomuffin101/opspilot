import { mockDeployments } from "@/src/data/mockDeployments";
import { logger } from "@/src/lib/logger";
import { isDemoMode } from "@/src/lib/utils";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { DeploymentToolResult } from "@/src/types/tools";

export class DeploymentTool implements IncidentTool<DeploymentToolResult> {
  readonly name = "deployments";

  async execute(query: InvestigationQuery): Promise<DeploymentToolResult> {
    const demoMode = isDemoMode();
    logger.info(
      demoMode
        ? "Demo mode active: DeploymentTool using mock deployments"
        : "DeploymentTool using mock deployments",
      { reason: demoMode ? "demo_mode" : "provider_not_configured" },
    );
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

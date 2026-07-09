import { DeploymentTool } from "@/src/tools/deploymentTool";
import { GitHubTool } from "@/src/tools/githubTool";
import { IncidentHistoryTool } from "@/src/tools/incidentHistoryTool";
import { OwnershipTool } from "@/src/tools/ownershipTool";
import { RepoAuditTool } from "@/src/tools/repoAuditTool";
import { SlackSearchTool } from "@/src/tools/slackSearchTool";
import type { IncidentTool } from "@/src/tools/base";
import type { InvestigationToolResult } from "@/src/types/tools";

export type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
export {
  DeploymentTool,
  GitHubTool,
  IncidentHistoryTool,
  OwnershipTool,
  RepoAuditTool,
  SlackSearchTool,
};

export class ToolRegistry {
  private readonly tools = new Map<string, IncidentTool<InvestigationToolResult>>();

  register(tool: IncidentTool<InvestigationToolResult>): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  getTools(): readonly IncidentTool<InvestigationToolResult>[] {
    return [...this.tools.values()];
  }
}

export function createDefaultToolRegistry(): ToolRegistry {
  return new ToolRegistry()
    .register(new SlackSearchTool())
    .register(new GitHubTool())
    .register(new DeploymentTool())
    .register(new IncidentHistoryTool())
    .register(new OwnershipTool());
}

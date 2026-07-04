import type { IncidentSeverity } from "@/src/types/incident";

export interface SlackMessageSignal {
  channel: string;
  author: string;
  text: string;
  timestamp: string;
  permalink?: string;
}

export interface SlackSearchResult {
  kind: "slackHistory";
  messages: SlackMessageSignal[];
}

export interface CommitSignal {
  deploymentId: string;
  sha: string;
  message: string;
  author: string;
  risk: "low" | "medium" | "high";
  filesChanged: string[];
  committedAt: string;
  url?: string;
}

export interface GitHubToolResult {
  kind: "commits";
  commits: CommitSignal[];
}

export interface DeploymentSignal {
  id: string;
  service: string;
  environment: string;
  version: string;
  status: string;
  sha: string;
  summary: string;
  deployedAt: string;
  completedAt?: string;
  url?: string;
}

export interface DeploymentToolResult {
  kind: "deployments";
  deployments: DeploymentSignal[];
}

export interface IncidentHistorySignal {
  id: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  occurredAt: string;
  summary: string;
  rootCause: string;
  resolution: string;
}

export interface IncidentHistoryResult {
  kind: "previousIncidents";
  incidents: IncidentHistorySignal[];
}

export interface OwnerSignal {
  name: string;
  role: string;
  team: string;
  slackUserId?: string;
}

export interface OwnershipResult {
  kind: "owners";
  service: string;
  team: string;
  slackChannel: string;
  owners: OwnerSignal[];
}

export type InvestigationToolResult =
  | SlackSearchResult
  | GitHubToolResult
  | DeploymentToolResult
  | IncidentHistoryResult
  | OwnershipResult;

export interface ToolExecutionFailure {
  tool: string;
  message: string;
}

export interface InvestigationEvidence {
  slackHistory: SlackMessageSignal[];
  commits: CommitSignal[];
  deployments: DeploymentSignal[];
  owners: OwnerSignal[];
  previousIncidents: IncidentHistorySignal[];
  toolFailures: ToolExecutionFailure[];
}

import type { IncidentSeverity } from "@/src/types/incident";

export interface SlackMessageSignal {
  channel: string;
  author: string;
  text: string;
  timestamp: string;
  permalink?: string;
  relevanceScore?: number;
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
  relevanceScore: number;
  matchedTerms: string[];
}

export interface GitHubToolResult {
  kind: "commits";
  commits: CommitSignal[];
}

export type RepoAuditRiskLevel = "high" | "medium" | "low";

export interface RepoAuditChange {
  sha: string;
  message: string;
  author: string;
  committedAt: string;
  url?: string;
  filesChanged: string[];
  risk: RepoAuditRiskLevel;
  reasons: string[];
  contentSignals: string[];
}

export interface RepoAuditResult {
  repo: {
    owner: string;
    name: string;
  };
  scannedCommits: number;
  highRiskChanges: RepoAuditChange[];
  mediumRiskChanges: RepoAuditChange[];
  lowRiskChanges: RepoAuditChange[];
  configConcerns: string[];
  securityConcerns: string[];
  recommendedActions: string[];
  summary: string;
  confidenceScore: number;
  metadataOnly: boolean;
  limitations: string[];
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

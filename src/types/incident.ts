export type IncidentSeverity = "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

export type IncidentEvidenceSource =
  | "slack_history"
  | "deploy_history"
  | "code_change"
  | "observability";

export interface IncidentEvidence {
  source: IncidentEvidenceSource;
  detail: string;
  capturedAt: string;
  signal: string;
  url?: string;
}

export interface IncidentTimelineEntry {
  timestamp: string;
  event: string;
  author: string;
}

export interface IncidentOwner {
  name: string;
  role: string;
  team: string;
  slackUserId?: string;
}

export interface CustomerImpact {
  description: string;
  affectedRegions: string[];
  estimatedFailedRequests?: number;
  affectedJourney: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  service: string;
  summary: string;
  status: IncidentStatus;
  impact: string;
  customerImpact: CustomerImpact;
  rootCause: string;
  resolution: string;
  evidence: IncidentEvidence[];
  recommendedActions: string[];
  timeline: IncidentTimelineEntry[];
  owners: IncidentOwner[];
}

export interface SlackIncidentMessage {
  channel: string;
  author: string;
  text: string;
  timestamp: string;
  permalink?: string;
}

export interface ServiceOwnership {
  service: string;
  team: string;
  slackChannel: string;
  owners: IncidentOwner[];
}

export interface SimilarIncident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  occurredAt: string;
  resolution: string;
}

export interface CommitSignal {
  sha: string;
  message: string;
  author: string;
  risk: "low" | "medium" | "high";
  filesChanged: string[];
}

export interface RecentDeployment {
  id: string;
  service: string;
  environment: string;
  version: string;
  status: string;
  sha: string;
  summary: string;
  deployedAt: string;
  completedAt?: string;
  commitSignals: CommitSignal[];
  url?: string;
}

export interface PostmortemDraft {
  summary: string;
  impact: string;
  rootCause: string;
  resolution: string;
  timeline: IncidentTimelineEntry[];
  followUps: string[];
}

export interface IncidentInvestigation {
  id: string;
  title: string;
  severity: IncidentSeverity;
  service: string;
  status: IncidentStatus;
  summary: string;
  impact: string;
  likelyRootCauses: string[];
  evidence: IncidentEvidence[];
  similarIncidents: SimilarIncident[];
  recentDeployments: RecentDeployment[];
  recommendedActions: string[];
  suggestedOwners: IncidentOwner[];
  timeline: IncidentTimelineEntry[];
  statusUpdate: string;
  postmortemDraft: PostmortemDraft;
  confidenceScore: number;
  customerImpact: CustomerImpact;
  nextUpdateDue: string;
}

/** Active conversational incident retained for follow-up requests in a warm runtime. */
export interface IncidentContext {
  teamId: string;
  channelId: string;
  threadTs?: string;
  requesterId: string;
  issueText: string;
  investigation: IncidentInvestigation;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentMemorySummary {
  incidentId: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

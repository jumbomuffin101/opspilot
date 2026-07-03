export type IncidentSeverity = "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

export interface IncidentEvidence {
  source: "slack" | "github" | "observability" | "deployment";
  detail: string;
  capturedAt: string;
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
  slackUserId?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  service: string;
  summary: string;
  status: IncidentStatus;
  evidence: IncidentEvidence[];
  recommendedActions: string[];
  timeline: IncidentTimelineEntry[];
  owners: IncidentOwner[];
}

export interface SimilarIncident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  resolution: string;
}

export interface DeploymentClue {
  deploymentId: string;
  service: string;
  environment: string;
  sha: string;
  summary: string;
  deployedAt: string;
  status: string;
}

export interface IncidentInvestigation {
  issueText: string;
  title: string;
  severity: IncidentSeverity;
  suspectedService: string;
  summary: string;
  likelyRootCauses: string[];
  evidence: IncidentEvidence[];
  similarIncidents: SimilarIncident[];
  recentDeploymentClues: DeploymentClue[];
  recommendedNextSteps: string[];
  suggestedOwners: IncidentOwner[];
}

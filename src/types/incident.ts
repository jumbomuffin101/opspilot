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

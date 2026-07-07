import type { IncidentSeverity } from "@/src/types/incident";

export interface InvestigationQuery {
  issue: string;
  service?: string;
  severity?: IncidentSeverity;
  teamId?: string;
}

export interface IncidentTool<Result> {
  readonly name: string;
  execute(query: InvestigationQuery): Promise<Result>;
}

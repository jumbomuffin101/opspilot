import { mockIncidents } from "@/src/data/mockIncidents";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { IncidentHistoryResult } from "@/src/types/tools";

export class IncidentHistoryTool implements IncidentTool<IncidentHistoryResult> {
  readonly name = "incident-history";

  async execute(query: InvestigationQuery): Promise<IncidentHistoryResult> {
    const incidents = mockIncidents
      .filter((incident) => !query.service || incident.service === query.service)
      .map((incident) => ({
        id: incident.id,
        title: incident.title,
        service: incident.service,
        severity: incident.severity,
        occurredAt: incident.timeline[0]?.timestamp ?? "1970-01-01T00:00:00.000Z",
        summary: incident.summary,
        rootCause: incident.rootCause,
        resolution: incident.resolution,
      }));

    return { kind: "previousIncidents", incidents };
  }
}

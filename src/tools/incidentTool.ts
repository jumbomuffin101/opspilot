import { mockIncidents } from "@/src/data/mockIncidents";
import type { Incident, IncidentStatus } from "@/src/types/incident";

export interface IncidentToolInput {
  service?: string;
  status?: IncidentStatus;
}

export function listMockIncidents(input: IncidentToolInput = {}): Incident[] {
  return mockIncidents.filter((incident) => {
    const matchesService = !input.service || incident.service === input.service;
    const matchesStatus = !input.status || incident.status === input.status;
    return matchesService && matchesStatus;
  });
}

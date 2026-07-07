import { mockIncidents } from "@/src/data/mockIncidents";
import type { IncidentMemorySummary } from "@/src/types/incident";

import { IncidentDashboardClient } from "@/components/home/IncidentDashboardClient";
import { SectionHeading } from "@/components/home/SectionHeading";

function demoIncidents(): IncidentMemorySummary[] {
  return mockIncidents.slice(0, 3).map((incident) => ({
    incidentId: incident.id,
    title: incident.title,
    service: incident.service,
    severity: incident.severity,
    status: incident.status,
    createdAt: incident.timeline[0]?.timestamp ?? "2026-07-03T14:08:00.000Z",
    updatedAt: incident.timeline.at(-1)?.timestamp ?? "2026-07-03T14:21:00.000Z",
  }));
}

export function IncidentDashboard() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
      <SectionHeading
        eyebrow="Companion dashboard"
        title="Recent incident memory, without replacing Slack."
        description="OpsPilot keeps durable incident context for follow-up questions, button actions, and lightweight operational visibility."
      />

      <IncidentDashboardClient demoIncidents={demoIncidents()} />
    </section>
  );
}

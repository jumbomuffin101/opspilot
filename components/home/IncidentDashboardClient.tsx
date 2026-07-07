"use client";

import { useEffect, useState } from "react";

import type {
  IncidentMemorySummary,
  IncidentSeverity,
  IncidentStatus,
} from "@/src/types/incident";

interface IncidentDashboardClientProps {
  demoIncidents: IncidentMemorySummary[];
}

interface IncidentApiItem {
  incident_id: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
}

interface IncidentApiResponse {
  incidents: IncidentApiItem[];
}

function isSeverity(value: unknown): value is IncidentSeverity {
  return value === "SEV-1" || value === "SEV-2" || value === "SEV-3" || value === "SEV-4";
}

function isStatus(value: unknown): value is IncidentStatus {
  return (
    value === "investigating" ||
    value === "identified" ||
    value === "monitoring" ||
    value === "resolved"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIncidentApiResponse(value: unknown): IncidentMemorySummary[] {
  if (!isRecord(value) || !Array.isArray(value.incidents)) return [];

  return value.incidents.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.incident_id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.service !== "string" ||
      !isSeverity(item.severity) ||
      !isStatus(item.status) ||
      typeof item.created_at !== "string" ||
      typeof item.updated_at !== "string"
    ) {
      return [];
    }

    return {
      incidentId: item.incident_id,
      title: item.title,
      service: item.service,
      severity: item.severity,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  });
}

function formatDashboardTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function severityLabel(severity: IncidentSeverity): string {
  const labels: Record<IncidentSeverity, string> = {
    "SEV-1": "SEV-1 / Critical",
    "SEV-2": "SEV-2 / Major",
    "SEV-3": "SEV-3 / Moderate",
    "SEV-4": "SEV-4 / Minor",
  };
  return labels[severity];
}

function statusLabel(status: IncidentStatus): string {
  const labels: Record<IncidentStatus, string> = {
    investigating: "Investigating",
    identified: "Identified",
    monitoring: "Monitoring",
    resolved: "Resolved",
  };
  return labels[status];
}

export function IncidentDashboardClient({
  demoIncidents,
}: IncidentDashboardClientProps) {
  const [incidents, setIncidents] = useState<IncidentMemorySummary[]>(demoIncidents);
  const [source, setSource] = useState<"demo" | "live">("demo");

  useEffect(() => {
    const controller = new AbortController();

    async function loadIncidents(): Promise<void> {
      try {
        const response = await fetch("/api/incidents?limit=4", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const data: unknown = (await response.json()) as IncidentApiResponse;
        const parsed = parseIncidentApiResponse(data);
        if (parsed.length > 0) {
          setIncidents(parsed);
          setSource("live");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    void loadIncidents();

    return () => controller.abort();
  }, []);

  return (
    <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.035] shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[.035] px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">Incident memory</p>
          <p className="mt-1 text-xs text-slate-500">
            {source === "demo"
              ? "Demo records shown until Slack investigations are stored."
              : "Live records from OpsPilot incident memory."}
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200">
          Slack remains primary
        </span>
      </div>

      <div className="divide-y divide-white/10">
        {incidents.map((incident) => (
          <div
            key={incident.incidentId}
            className="grid gap-4 px-5 py-4 sm:grid-cols-[1.3fr_.8fr_.8fr_.8fr] sm:items-center"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[.16em] text-slate-500">
                {incident.incidentId}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{incident.title}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">Service</p>
              <p className="mt-1 font-mono text-xs text-slate-300">{incident.service}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">State</p>
              <p className="mt-1 text-xs text-slate-300">
                {severityLabel(incident.severity)}
                <span className="mx-2 text-slate-700">/</span>
                {statusLabel(incident.status)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">Updated</p>
              <p className="mt-1 text-xs text-slate-300">
                {formatDashboardTime(incident.updatedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

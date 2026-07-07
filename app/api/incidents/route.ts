import { NextResponse } from "next/server";

import { listRecentIncidents } from "@/src/agents/persistentIncidentStore";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 10;

  try {
    const incidents = await listRecentIncidents(limit);
    return NextResponse.json(
      {
        incidents: incidents.map((incident) => ({
          incident_id: incident.incidentId,
          title: incident.title,
          service: incident.service,
          severity: incident.severity,
          status: incident.status,
          created_at: incident.createdAt,
          updated_at: incident.updatedAt,
        })),
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    logger.warn("Failed to return recent incidents", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { incidents: [] },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }
}

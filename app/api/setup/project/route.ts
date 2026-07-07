import { NextResponse } from "next/server";

import {
  normalizeDeploymentProvider,
  normalizeServicePaths,
  saveProjectConfig,
} from "@/src/config/projectConfigStore";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maximumLength = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximumLength) return null;
  return trimmed;
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid setup payload" }, { status: 400 });
  }

  const teamId = cleanString(payload.team_id, 80);
  const githubOwner = cleanString(payload.github_owner);
  const githubRepo = cleanString(payload.github_repo);
  const workspaceName =
    typeof payload.workspace_name === "string" && payload.workspace_name.trim()
      ? payload.workspace_name.trim().slice(0, 120)
      : undefined;
  const defaultService =
    typeof payload.default_service === "string" && payload.default_service.trim()
      ? payload.default_service.trim().slice(0, 120)
      : undefined;
  const deploymentProvider =
    typeof payload.deployment_provider === "string"
      ? normalizeDeploymentProvider(payload.deployment_provider)
      : null;
  const servicePaths = normalizeServicePaths(payload.service_paths_json);

  if (!teamId) return NextResponse.json({ error: "Missing team_id" }, { status: 400 });
  if (!githubOwner) {
    return NextResponse.json({ error: "GitHub owner is required" }, { status: 400 });
  }
  if (!githubRepo) {
    return NextResponse.json({ error: "GitHub repo is required" }, { status: 400 });
  }
  if (!deploymentProvider) {
    return NextResponse.json({ error: "Deployment provider is invalid" }, { status: 400 });
  }
  if (!servicePaths) {
    return NextResponse.json(
      { error: "Service path mapping must be a JSON object of string arrays" },
      { status: 400 },
    );
  }

  const saved = await saveProjectConfig({
    teamId,
    workspaceName,
    githubOwner,
    githubRepo,
    defaultService,
    servicePaths,
    deploymentProvider,
  });

  if (!saved) {
    logger.warn("Project setup failed to persist", { teamId });
    return NextResponse.json(
      {
        error:
          "Project configuration could not be saved. Configure DATABASE_URL and run migrations.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    project: {
      team_id: teamId,
      workspace_name: workspaceName,
      github_owner: githubOwner,
      github_repo: githubRepo,
      default_service: defaultService,
      deployment_provider: deploymentProvider,
    },
  });
}

import { NextResponse } from "next/server";

import { getGitHubInstallationByTeam } from "@/src/github/githubInstallationStore";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SafeGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  html_url?: string;
  default_branch?: string;
  updated_at?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function toSafeRepo(value: unknown): SafeGitHubRepo | null {
  if (!isRecord(value)) return null;
  const owner = isRecord(value.owner) ? optionalString(value.owner.login) : undefined;
  const id = typeof value.id === "number" ? value.id : null;
  const name = optionalString(value.name);
  const fullName = optionalString(value.full_name);
  const isPrivate = typeof value.private === "boolean" ? value.private : null;

  if (id === null || !name || !fullName || !owner || isPrivate === null) return null;

  return {
    id,
    name,
    full_name: fullName,
    owner,
    private: isPrivate,
    html_url: optionalString(value.html_url),
    default_branch: optionalString(value.default_branch),
    updated_at: optionalString(value.updated_at),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const teamId = url.searchParams.get("team_id")?.trim();

  if (!teamId) {
    return NextResponse.json({ error: "Missing team_id" }, { status: 400 });
  }

  const installation = await getGitHubInstallationByTeam(teamId);
  if (!installation) {
    return NextResponse.json(
      { error: "GitHub is not connected for this workspace" },
      { status: 404 },
    );
  }

  try {
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${installation.githubAccessToken}`,
          "user-agent": "OpsPilot",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      logger.warn("GitHub repository list request failed", {
        teamId,
        status: response.status,
      });
      return NextResponse.json(
        { error: "GitHub repositories could not be loaded" },
        { status: response.status },
      );
    }

    const payload: unknown = await response.json();
    const repos = Array.isArray(payload)
      ? payload.map(toSafeRepo).filter((repo): repo is SafeGitHubRepo => repo !== null)
      : [];

    return NextResponse.json({ repos });
  } catch (error) {
    logger.warn("GitHub repository list request failed", {
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "GitHub repositories could not be loaded" },
      { status: 502 },
    );
  }
}

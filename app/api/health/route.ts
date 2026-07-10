import { NextResponse } from "next/server";

import {
  checkDatabaseStatus,
  getIncidentMemoryMode,
} from "@/src/agents/persistentIncidentStore";
import { APP_NAME, ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { isDemoMode } from "@/src/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasEnv(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function integrationStatus(keys: string[]): "configured" | "missing" {
  return keys.every(hasEnv) ? "configured" : "missing";
}

export async function GET(): Promise<NextResponse> {
  const database = await checkDatabaseStatus();

  return NextResponse.json(
    {
      status: "ok",
      app: APP_NAME,
      mode: isDemoMode() ? "demo" : "production",
      memory: getIncidentMemoryMode(),
      database,
      integrations: {
        slackOAuth: integrationStatus([
          ENVIRONMENT_KEYS.slackClientId,
          ENVIRONMENT_KEYS.slackClientSecret,
          ENVIRONMENT_KEYS.slackRedirectUri,
        ]),
        slackRuntime: integrationStatus([
          ENVIRONMENT_KEYS.slackBotToken,
          ENVIRONMENT_KEYS.slackSigningSecret,
        ]),
        githubOAuth: integrationStatus([
          ENVIRONMENT_KEYS.githubClientId,
          ENVIRONMENT_KEYS.githubClientSecret,
          ENVIRONMENT_KEYS.githubRedirectUri,
        ]),
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

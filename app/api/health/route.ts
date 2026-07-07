import { NextResponse } from "next/server";

import {
  checkDatabaseStatus,
  getIncidentMemoryMode,
} from "@/src/agents/persistentIncidentStore";
import { APP_NAME } from "@/src/lib/constants";
import { isDemoMode } from "@/src/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const database = await checkDatabaseStatus();

  return NextResponse.json(
    {
      status: "ok",
      app: APP_NAME,
      mode: isDemoMode() ? "demo" : "production",
      memory: getIncidentMemoryMode(),
      database,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

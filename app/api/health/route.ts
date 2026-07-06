import { NextResponse } from "next/server";

import { APP_NAME } from "@/src/lib/constants";
import { isDemoMode } from "@/src/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: "ok",
      app: APP_NAME,
      mode: isDemoMode() ? "demo" : "production",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

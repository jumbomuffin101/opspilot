import { NextResponse } from "next/server";

import { APP_NAME, ENVIRONMENT_KEYS } from "@/src/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLACK_SCOPES = [
  "commands",
  "chat:write",
  "channels:manage",
  "channels:read",
  "groups:read",
  "users:read",
  "app_mentions:read",
] as const;

function setupError(message: string): NextResponse {
  return new NextResponse(
    `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${APP_NAME} setup required</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080a12; color: #e5e7eb; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            main { max-width: 640px; margin: 24px; padding: 32px; border: 1px solid rgba(255,255,255,.12); border-radius: 24px; background: rgba(255,255,255,.04); box-shadow: 0 30px 120px rgba(0,0,0,.45); }
            h1 { margin: 0 0 12px; font-size: 28px; letter-spacing: -.04em; }
            p { margin: 0; color: #94a3b8; line-height: 1.65; }
            code { color: #c4b5fd; }
          </style>
        </head>
        <body>
          <main>
            <h1>Slack installation is not configured yet.</h1>
            <p>${message}</p>
          </main>
        </body>
      </html>`,
    {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

export function GET(): NextResponse {
  const clientId = process.env[ENVIRONMENT_KEYS.slackClientId]?.trim();
  const redirectUri = process.env[ENVIRONMENT_KEYS.slackRedirectUri]?.trim();

  if (!clientId) {
    return setupError("Set <code>SLACK_CLIENT_ID</code> to enable the Add to Slack install flow.");
  }

  if (!redirectUri) {
    return setupError("Set <code>SLACK_REDIRECT_URI</code> to your deployed OAuth callback URL.");
  }

  const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", SLACK_SCOPES.join(","));
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(authorizeUrl);
}

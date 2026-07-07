import { NextResponse } from "next/server";

import { APP_NAME, ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { logger } from "@/src/lib/logger";
import { saveInstallation } from "@/src/slack/installationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SlackOAuthAccessResponse {
  ok: boolean;
  error?: string;
  app_id?: string;
  authed_user?: { id?: string };
  scope?: string;
  access_token?: string;
  bot_user_id?: string;
  team?: { id?: string; name?: string };
  enterprise?: { id?: string; name?: string } | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function friendlyError(title: string, message: string, status = 400): NextResponse {
  return new NextResponse(
    `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${APP_NAME} installation</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080a12; color: #e5e7eb; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            main { max-width: 680px; margin: 24px; padding: 34px; border: 1px solid rgba(255,255,255,.12); border-radius: 24px; background: rgba(255,255,255,.04); box-shadow: 0 30px 120px rgba(0,0,0,.45); }
            h1 { margin: 0 0 12px; font-size: 28px; letter-spacing: -.04em; }
            p { margin: 0; color: #94a3b8; line-height: 1.65; }
            a { color: #a5f3fc; }
            code { color: #c4b5fd; }
          </style>
        </head>
        <body>
          <main>
            <h1>${title}</h1>
            <p>${message}</p>
          </main>
        </body>
      </html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

function hasInstallationPayload(
  payload: SlackOAuthAccessResponse,
): payload is SlackOAuthAccessResponse & {
  access_token: string;
  team: { id: string; name?: string };
} {
  return (
    payload.ok === true &&
    typeof payload.access_token === "string" &&
    payload.access_token.length > 0 &&
    typeof payload.team?.id === "string" &&
    payload.team.id.length > 0
  );
}

async function exchangeCode(code: string): Promise<SlackOAuthAccessResponse> {
  const clientId = process.env[ENVIRONMENT_KEYS.slackClientId]?.trim();
  const clientSecret = process.env[ENVIRONMENT_KEYS.slackClientSecret]?.trim();
  const redirectUri = process.env[ENVIRONMENT_KEYS.slackRedirectUri]?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return {
      ok: false,
      error: "missing_oauth_configuration",
    };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  return (await response.json()) as SlackOAuthAccessResponse;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error) {
    return friendlyError(
      "Slack installation was cancelled.",
      `Slack returned <code>${escapeHtml(error)}</code>. You can retry the installation from the OpsPilot homepage.`,
    );
  }

  if (!code) {
    return friendlyError("Missing OAuth code.", "Slack did not include an OAuth code in the callback URL.");
  }

  let payload: SlackOAuthAccessResponse;
  try {
    payload = await exchangeCode(code);
  } catch (exchangeError) {
    logger.error("Slack OAuth exchange failed", {
      error: exchangeError instanceof Error ? exchangeError.message : String(exchangeError),
    });
    return friendlyError(
      "Slack installation failed.",
      "OpsPilot could not complete the OAuth exchange. Check the Slack app credentials and retry.",
      502,
    );
  }

  if (!hasInstallationPayload(payload)) {
    logger.warn("Slack OAuth exchange returned an unusable response", {
      error: payload.error,
      ok: payload.ok,
    });
    return friendlyError(
      "Slack installation could not be saved.",
      `Slack returned <code>${escapeHtml(payload.error ?? "invalid_response")}</code>. Verify <code>SLACK_CLIENT_ID</code>, <code>SLACK_CLIENT_SECRET</code>, and <code>SLACK_REDIRECT_URI</code>.`,
      502,
    );
  }

  const saved = await saveInstallation({
    teamId: payload.team.id,
    teamName: payload.team.name ?? payload.team.id,
    enterpriseId: payload.enterprise?.id,
    appId: payload.app_id,
    botUserId: payload.bot_user_id,
    botAccessToken: payload.access_token,
    scope: payload.scope ?? "",
  });

  if (!saved) {
    return friendlyError(
      "Database setup is required.",
      "OpsPilot installed successfully in Slack, but this deployment could not save the workspace installation. Configure <code>DATABASE_URL</code>, run the migrations, and reinstall the app.",
      503,
    );
  }

  const setupUrl = new URL("/setup", url.origin);
  setupUrl.searchParams.set("team_id", payload.team.id);

  return NextResponse.redirect(setupUrl);
}

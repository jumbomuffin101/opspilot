import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { saveGitHubInstallation } from "@/src/github/githubInstallationStore";
import { verifyGitHubOAuthState } from "@/src/github/oauthState";
import { APP_NAME, ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_OAUTH_NONCE_COOKIE = "opspilot_github_oauth_nonce";

interface GitHubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  login?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCookieValue(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }

  return null;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function friendlyError(title: string, message: string, status = 400): NextResponse {
  return new NextResponse(
    `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${APP_NAME} GitHub setup</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080a12; color: #e5e7eb; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            main { max-width: 680px; margin: 24px; padding: 34px; border: 1px solid rgba(255,255,255,.12); border-radius: 24px; background: rgba(255,255,255,.04); box-shadow: 0 30px 120px rgba(0,0,0,.45); }
            h1 { margin: 0 0 12px; font-size: 28px; letter-spacing: -.04em; }
            p { margin: 0; color: #94a3b8; line-height: 1.65; }
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

async function exchangeCode(code: string): Promise<GitHubTokenResponse> {
  const clientId = process.env[ENVIRONMENT_KEYS.githubClientId]?.trim();
  const clientSecret = process.env[ENVIRONMENT_KEYS.githubClientSecret]?.trim();
  const redirectUri = process.env[ENVIRONMENT_KEYS.githubRedirectUri]?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return { error: "missing_oauth_configuration" };
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  return (await response.json()) as GitHubTokenResponse;
}

async function fetchGitHubUser(accessToken: string): Promise<string | null> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${accessToken}`,
      "user-agent": "OpsPilot",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as GitHubUserResponse;
  return typeof payload.login === "string" && payload.login ? payload.login : null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const clientSecret = process.env[ENVIRONMENT_KEYS.githubClientSecret]?.trim();

  if (error) {
    return friendlyError(
      "GitHub connection was cancelled.",
      `GitHub returned <code>${escapeHtml(error)}</code>. You can retry from setup.`,
    );
  }

  if (!code || !state) {
    return friendlyError("Missing OAuth callback data.", "GitHub did not include the required OAuth code and state.");
  }

  if (!clientSecret) {
    return friendlyError("GitHub OAuth is not configured.", "Set <code>GITHUB_CLIENT_SECRET</code> and retry.");
  }

  const verifiedState = verifyGitHubOAuthState(state, clientSecret);
  if (!verifiedState) {
    return friendlyError("GitHub OAuth state is invalid.", "The OAuth state was missing, expired, or could not be verified.");
  }

  const expectedNonce = getCookieValue(request, GITHUB_OAUTH_NONCE_COOKIE);
  if (!expectedNonce || !safeEqual(expectedNonce, verifiedState.nonce)) {
    return friendlyError(
      "GitHub OAuth state is invalid.",
      "The OAuth nonce was missing or could not be verified. Retry from setup.",
    );
  }

  let tokenPayload: GitHubTokenResponse;
  try {
    tokenPayload = await exchangeCode(code);
  } catch (exchangeError) {
    logger.error("GitHub OAuth exchange failed", {
      teamId: verifiedState.teamId,
      error: exchangeError instanceof Error ? exchangeError.message : String(exchangeError),
    });
    return friendlyError(
      "GitHub connection failed.",
      "OpsPilot could not exchange the GitHub OAuth code. Check OAuth app credentials and retry.",
      502,
    );
  }

  if (!tokenPayload.access_token) {
    logger.warn("GitHub OAuth exchange returned no access token", {
      teamId: verifiedState.teamId,
      error: tokenPayload.error,
    });
    return friendlyError(
      "GitHub connection failed.",
      `GitHub returned <code>${escapeHtml(tokenPayload.error ?? "invalid_response")}</code>.`,
      502,
    );
  }

  const login = await fetchGitHubUser(tokenPayload.access_token);
  if (!login) {
    return friendlyError(
      "GitHub user lookup failed.",
      "OpsPilot connected to GitHub but could not identify the authorized user.",
      502,
    );
  }

  const saved = await saveGitHubInstallation({
    teamId: verifiedState.teamId,
    githubUserLogin: login,
    githubAccessToken: tokenPayload.access_token,
    scope: tokenPayload.scope ?? "",
  });

  if (!saved) {
    return friendlyError(
      "Database setup is required.",
      "GitHub connected successfully, but OpsPilot could not save the installation. Configure <code>DATABASE_URL</code>, run migrations, and retry.",
      503,
    );
  }

  const setupUrl = new URL("/setup/github", url.origin);
  setupUrl.searchParams.set("team_id", verifiedState.teamId);

  const response = NextResponse.redirect(setupUrl);
  response.cookies.delete(GITHUB_OAUTH_NONCE_COOKIE);
  return response;
}

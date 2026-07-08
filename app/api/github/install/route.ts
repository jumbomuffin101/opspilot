import { NextResponse } from "next/server";

import { createGitHubOAuthState } from "@/src/github/oauthState";
import { APP_NAME, ENVIRONMENT_KEYS } from "@/src/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_SCOPES = ["repo", "read:user"] as const;
const GITHUB_OAUTH_NONCE_COOKIE = "opspilot_github_oauth_nonce";

function setupError(message: string): NextResponse {
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
            <h1>GitHub connection is not configured yet.</h1>
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

export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  const teamId = url.searchParams.get("team_id")?.trim();
  const clientId = process.env[ENVIRONMENT_KEYS.githubClientId]?.trim();
  const clientSecret = process.env[ENVIRONMENT_KEYS.githubClientSecret]?.trim();
  const redirectUri = process.env[ENVIRONMENT_KEYS.githubRedirectUri]?.trim();

  if (!teamId) {
    return setupError("Open GitHub connection from <code>/setup?team_id=...</code>.");
  }

  if (!clientId) {
    return setupError("Set <code>GITHUB_CLIENT_ID</code> to enable GitHub OAuth.");
  }

  if (!clientSecret) {
    return setupError("Set <code>GITHUB_CLIENT_SECRET</code> to sign OAuth state and exchange codes.");
  }

  if (!redirectUri) {
    return setupError("Set <code>GITHUB_REDIRECT_URI</code> to your deployed GitHub OAuth callback URL.");
  }

  const oauthState = createGitHubOAuthState(teamId, clientSecret);
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", GITHUB_SCOPES.join(" "));
  authorizeUrl.searchParams.set("state", oauthState.state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(GITHUB_OAUTH_NONCE_COOKIE, oauthState.nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/api/github/oauth/callback",
  });
  return response;
}

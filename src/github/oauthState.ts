import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

interface GitHubOAuthStatePayload {
  teamId: string;
  nonce: string;
  issuedAt: number;
}

export interface CreatedGitHubOAuthState {
  state: string;
  nonce: string;
}

export interface VerifiedGitHubOAuthState {
  teamId: string;
  nonce: string;
}

const STATE_TTL_MS = 10 * 60 * 1_000;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createGitHubOAuthState(
  teamId: string,
  secret: string,
): CreatedGitHubOAuthState {
  const nonce = randomBytes(16).toString("base64url");
  const payload: GitHubOAuthStatePayload = {
    teamId,
    nonce,
    issuedAt: Date.now(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return {
    state: `${encodedPayload}.${sign(encodedPayload, secret)}`,
    nonce,
  };
}

export function verifyGitHubOAuthState(
  state: string,
  secret: string,
): VerifiedGitHubOAuthState | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<GitHubOAuthStatePayload>;
    if (
      typeof payload.teamId !== "string" ||
      !payload.teamId ||
      typeof payload.nonce !== "string" ||
      !payload.nonce ||
      typeof payload.issuedAt !== "number" ||
      Date.now() - payload.issuedAt > STATE_TTL_MS
    ) {
      return null;
    }

    return { teamId: payload.teamId, nonce: payload.nonce };
  } catch {
    return null;
  }
}

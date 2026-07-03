import { createHmac, timingSafeEqual } from "node:crypto";

const SLACK_SIGNATURE_VERSION = "v0";
const MAX_REQUEST_AGE_SECONDS = 60 * 5;

export interface SlackVerificationInput {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  signingSecret?: string;
  now?: number;
}

export function verifySlackRequest({
  rawBody,
  signature,
  timestamp,
  signingSecret = process.env.SLACK_SIGNING_SECRET,
  now = Date.now(),
}: SlackVerificationInput): boolean {
  if (!signature || !timestamp || !signingSecret || !/^\d+$/.test(timestamp)) return false;

  const requestTimestamp = Number(timestamp);
  const currentTimestamp = Math.floor(now / 1000);
  if (Math.abs(currentTimestamp - requestTimestamp) > MAX_REQUEST_AGE_SECONDS) return false;

  const signatureBase = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  const expectedSignature = `${SLACK_SIGNATURE_VERSION}=${createHmac("sha256", signingSecret)
    .update(signatureBase, "utf8")
    .digest("hex")}`;
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

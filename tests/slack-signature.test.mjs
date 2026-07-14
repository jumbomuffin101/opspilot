import { createHmac } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import { verifySlackRequest } from "../src/slack/middleware.ts";

const secret = "test_signing_secret";
const timestamp = "1700000000";
const rawBody = "token=abc&team_id=T123&text=hello";
const signatureBase = `v0:${timestamp}:${rawBody}`;
const signature = `v0=${createHmac("sha256", secret).update(signatureBase, "utf8").digest("hex")}`;
const now = Number(timestamp) * 1000;

test("verifySlackRequest accepts a valid Slack signature", () => {
  assert.equal(
    verifySlackRequest({ rawBody, signature, timestamp, signingSecret: secret, now }),
    true,
  );
});

test("verifySlackRequest rejects stale timestamps and invalid signatures", () => {
  assert.equal(
    verifySlackRequest({
      rawBody,
      signature,
      timestamp,
      signingSecret: secret,
      now: now + 10 * 60 * 1000,
    }),
    false,
  );
  assert.equal(
    verifySlackRequest({
      rawBody,
      signature: `${signature}bad`,
      timestamp,
      signingSecret: secret,
      now,
    }),
    false,
  );
});

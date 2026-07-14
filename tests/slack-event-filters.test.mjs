import test from "node:test";
import assert from "node:assert/strict";

import {
  isBotOrSubtypeMessage,
  isDirectUserMessage,
} from "../src/slack/eventFilters.ts";

test("identifies valid Slack message.im user messages", () => {
  assert.equal(
    isDirectUserMessage({
      type: "message",
      channel_type: "im",
      user: "U123",
      text: "check my repo for issues",
    }),
    true,
  );
});

test("rejects bot and subtype message.im events", () => {
  assert.equal(
    isDirectUserMessage({
      type: "message",
      channel_type: "im",
      user: "U123",
      text: "edited",
      subtype: "message_changed",
    }),
    false,
  );
  assert.equal(isBotOrSubtypeMessage({ type: "message", bot_id: "B123" }), true);
  assert.equal(isBotOrSubtypeMessage({ type: "message", subtype: "message_deleted" }), true);
});

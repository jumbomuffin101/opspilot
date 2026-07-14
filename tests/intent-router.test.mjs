import test from "node:test";
import assert from "node:assert/strict";

import { routeConversationalIntent } from "../src/agents/intentRouter.ts";

test("routes flexible repository audit requests to repo_audit", () => {
  const examples = [
    "@OpsPilot check my repo for issues",
    "@OpsPilot check my OpsPilot repo for any issues",
    "@OpsPilot audit this repository",
    "@OpsPilot review recent changes",
    "@OpsPilot audit codebase",
  ];

  for (const example of examples) {
    assert.equal(routeConversationalIntent(example).intent, "repo_audit", example);
  }
});

test("keeps incident and repository follow-up intents distinct", () => {
  assert.equal(
    routeConversationalIntent("<@U123> investigate checkout failures").intent,
    "investigate",
  );
  assert.equal(routeConversationalIntent("@OpsPilot show evidence").intent, "evidence");
  assert.equal(
    routeConversationalIntent("@OpsPilot explain the highest risk change").intent,
    "risk_explain",
  );
  assert.equal(routeConversationalIntent("@OpsPilot what should I test?").intent, "test_plan");
});

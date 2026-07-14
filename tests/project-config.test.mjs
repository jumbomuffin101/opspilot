import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeDeploymentProvider,
  normalizeServicePaths,
} from "../src/config/projectConfigValidation.ts";

test("normalizes service path mappings safely", () => {
  assert.deepEqual(
    normalizeServicePaths({
      "checkout-api": [" app/api/checkout ", "", "src/checkout"],
    }),
    { "checkout-api": ["app/api/checkout", "src/checkout"] },
  );

  assert.equal(normalizeServicePaths({ "checkout-api": ["ok", 123] }), null);
  assert.equal(normalizeServicePaths(null), null);
});

test("normalizes supported deployment providers", () => {
  assert.equal(normalizeDeploymentProvider("GitHub Actions"), "github_actions");
  assert.equal(normalizeDeploymentProvider("vercel"), "vercel");
  assert.equal(normalizeDeploymentProvider("unknown"), null);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  changedFilesAreDocsOrStyles,
  classifyRepoAuditChange,
  extractContentSignals,
} from "../src/tools/repoAuditHeuristics.ts";

const baseCommit = {
  sha: "abc123456",
  message: "Update checkout auth flow",
  author: "dev",
  committedAt: "2026-07-14T12:00:00.000Z",
};

test("keeps documentation-only changes low risk", () => {
  const change = classifyRepoAuditChange(
    { ...baseCommit, message: "Update README with env var docs" },
    ["README.md", "docs/setup.md"],
  );

  assert.equal(changedFilesAreDocsOrStyles(change.filesChanged), true);
  assert.equal(change.risk, "low");
  assert.deepEqual(extractContentSignals("README.md", "Set DATABASE_URL and SLACK_BOT_TOKEN"), []);
});

test("classifies auth, API, and migration files as high-risk operational changes", () => {
  const change = classifyRepoAuditChange(baseCommit, [
    "app/api/slack/oauth/callback/route.ts",
    "db/migrations/005_add_events.sql",
  ]);

  assert.equal(change.risk, "high");
  assert.equal(change.reasons.some((reason) => reason.includes("API route")), true);
  assert.equal(change.reasons.some((reason) => reason.includes("migration")), true);
  assert.equal(change.contentSignals.some((signal) => signal.includes("database")), true);
});

test("deduplicates repeated content signals", () => {
  const change = classifyRepoAuditChange(baseCommit, [
    "src/auth/session.ts",
    "src/auth/session.ts",
  ]);

  assert.equal(change.risk, "high");
  assert.equal(new Set(change.contentSignals).size, change.contentSignals.length);
});

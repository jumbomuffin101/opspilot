# OpsPilot Security and Privacy Notes

OpsPilot is a Slack-native AI engineering operations agent. It handles Slack workspace tokens, GitHub OAuth tokens, repository metadata, incident context, and optional OpenAI requests. This document describes the current security posture and remaining hardening work.

## Token handling

- Slack bot tokens are stored server-side in `slack_installations`.
- GitHub OAuth tokens are stored server-side in `github_installations`.
- Deployment-wide fallback tokens are read from server-side environment variables.
- Tokens are never returned from setup APIs, repository APIs, health checks, or frontend pages.
- Logs identify token source decisions such as `workspace` or `environment`, but do not log token values.

Current limitation: application-level token encryption is not implemented. Use a managed PostgreSQL provider with encryption at rest and restrict database access.

## Tenant isolation

- Slack workspace identity is keyed by `team_id`.
- Project configuration is stored per Slack team.
- GitHub token lookup prefers the workspace GitHub token associated with the Slack `team_id`.
- Incident memory is scoped by workspace, channel, and thread when available.
- Repository audit context is scoped by workspace, channel, and thread in the in-memory store.

Production hardening recommendation: add authenticated setup sessions so possession of a `team_id` setup link is not the only setup-page guard.

## Slack request signing

- Slack command, event, and interactivity requests use HMAC SHA-256 verification.
- Requests older than five minutes are rejected.
- Signatures are compared with `timingSafeEqual`.
- Slack event IDs are deduplicated in memory to reduce retry/replay effects.

Current limitation: event deduplication is process-local. A shared cache would improve replay resistance across concurrent serverless instances.

## OAuth state validation

- Slack OAuth and GitHub OAuth use server-side callback routes.
- GitHub OAuth includes signed state and nonce validation before token exchange.
- OAuth callback errors should render user-friendly responses without exposing tokens.

Production hardening recommendation: short-lived encrypted setup sessions would make OAuth/setup continuation stronger.

## Database storage

- PostgreSQL stores incident memory, Slack installations, GitHub installations, and project configuration.
- SQL queries use parameterized statements.
- If the database is unavailable, incident memory falls back to bounded in-memory context.
- Public incident APIs return summary fields only and do not expose full investigation JSON by default.

## JSON parsing and payload handling

- Slack Events API payloads are parsed defensively from `unknown`.
- Unsupported event shapes are acknowledged with `200` to avoid Slack retry storms.
- Bot messages and message subtypes such as edits, deletes, and replies are ignored for direct-message routing.
- Slack API calls use request timeouts.

Production hardening recommendation: add explicit body-size limits at the platform or middleware layer.

## External providers

- GitHub API calls use workspace tokens first, environment fallback second, and deterministic mock fallback last.
- OpenAI calls are optional and disabled in demo mode.
- Slack Real-Time Search is adapter-ready but not claimed as live unless credentials are configured.

## Logging

Logs should include:

- request type and route;
- workspace/team ID;
- selected intent;
- context source;
- provider source such as `workspace`, `environment`, or `mock`;
- concise failure messages.

Logs must not include:

- Slack bot tokens;
- GitHub access tokens;
- OAuth client secrets;
- signing secrets;
- database URLs;
- private Slack message bodies unless explicitly needed for debugging in a controlled environment.

## Known limitations

- Setup pages are intentionally lightweight and do not yet have first-party user authentication.
- Event deduplication is in-memory.
- Button action idempotency is not fully durable.
- Repository audit is based on commit metadata and limited small-file inspection; it is not a full static-analysis scanner.
- Deployment provider evidence remains mocked.
- MCP is not implemented.

## Recommended production hardening

- Encrypt stored OAuth tokens at the application layer.
- Add setup-session authentication and expiry.
- Move event deduplication to Redis or another shared low-latency store.
- Add durable action idempotency keys.
- Add audit logs for setup changes and Slack actions.
- Add rate limiting on setup and public API routes.
- Add structured security tests for OAuth failure paths and API response redaction.

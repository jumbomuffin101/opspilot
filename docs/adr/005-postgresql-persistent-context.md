# ADR 005: PostgreSQL persistent context

## Context

Serverless instances are ephemeral. In-memory incident context is not enough for redeploys, cold starts, or multiple instances.

## Decision

OpsPilot uses PostgreSQL for incident memory, Slack installations, GitHub installations, and project configuration, with bounded in-memory fallback when `DATABASE_URL` is unavailable.

## Alternatives considered

- Keep memory-only context.
- Add a full ORM.
- Use a key-value store for all state.

## Consequences

- Context survives redeploys when the database is configured.
- SQL migrations are explicit and easy to inspect.
- The fallback keeps local/demo usage simple.

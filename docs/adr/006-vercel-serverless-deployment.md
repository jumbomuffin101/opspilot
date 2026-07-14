# ADR 006: Serverless deployment on Vercel

## Context

OpsPilot is a Next.js App Router application with Slack webhooks, OAuth callbacks, setup pages, and static marketing pages.

## Decision

OpsPilot targets Vercel using App Router route handlers and request-time client initialization.

## Alternatives considered

- Long-running Node server.
- Separate backend and frontend deployments.

## Consequences

- Deployment is straightforward for a portfolio and hackathon submission.
- Slack routes must acknowledge quickly and use asynchronous continuation where appropriate.
- Persistent state must live outside the serverless process.

# ADR 004: Workspace-specific OAuth tokens

## Context

A deployment-wide GitHub token is useful for development but does not scale to multiple Slack workspaces or customer-owned repositories.

## Decision

OpsPilot stores Slack installations and GitHub installations per Slack `team_id`. Runtime GitHub access prefers the workspace GitHub token, then falls back to environment configuration, then mock data.

## Alternatives considered

- Use only a global GitHub token.
- Require users to paste tokens into setup.

## Consequences

- Workspaces can connect their own repositories.
- Tokens stay server-side.
- Setup requires OAuth app configuration and database migrations.

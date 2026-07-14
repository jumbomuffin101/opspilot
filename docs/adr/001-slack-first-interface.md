# ADR 001: Slack-first product interface

## Context

Incident response and engineering coordination already happen in Slack. A separate dashboard would add context switching during high-pressure moments.

## Decision

OpsPilot uses Slack as the primary product interface. The website is a companion for installation, setup, documentation, and portfolio presentation.

## Alternatives considered

- Build a dashboard-first incident product.
- Use Slack only for notifications.

## Consequences

- Slack request verification, fast acknowledgement, Block Kit design, and threaded context are central concerns.
- The web app stays lightweight.
- Product value is visible where engineers already work.

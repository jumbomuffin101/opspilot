# ADR 002: Tool-based agent architecture

## Context

Incident reasoning needs evidence from Slack, GitHub, deployments, incident history, and ownership. Directly coupling the agent to providers would make future integrations expensive to replace.

## Decision

OpsPilot uses typed tools and an evidence aggregator. Each tool owns one evidence source and returns normalized data.

## Alternatives considered

- Put all provider calls directly inside the incident agent.
- Build separate agents per provider.

## Consequences

- Provider implementations can move from mock to real APIs without changing Slack output.
- Partial tool failure can be tolerated.
- The reasoning layer receives stable evidence contracts.

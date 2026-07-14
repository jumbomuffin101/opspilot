# ADR 007: Separate incident and repository workflows

## Context

An incident investigation and a repository audit answer different questions. Mixing their language could create misleading severity, customer-impact, or postmortem claims.

## Decision

OpsPilot keeps incident investigation and repository audit as separate workflows that share Slack transport and context mechanics but use different result types and Block Kit responses.

## Alternatives considered

- Treat every repository audit as an incident.
- Use one generic analysis response for all requests.

## Consequences

- Repository audits avoid SEV/customer-impact/postmortem language unless the user starts an incident investigation.
- Follow-up questions can resolve to the correct active context.
- Slack responses are clearer and safer.

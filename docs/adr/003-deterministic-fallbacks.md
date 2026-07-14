# ADR 003: Deterministic fallbacks

## Context

Hackathon demos and incident workflows should not fail because OpenAI, GitHub, Slack search, or another provider is unavailable.

## Decision

OpsPilot supports deterministic mock evidence and deterministic reasoning. `DEMO_MODE=true` forces those paths while preserving real Slack delivery.

## Alternatives considered

- Require all external providers for every workflow.
- Use AI-only reasoning without validation or fallback.

## Consequences

- The checkout outage demo is repeatable.
- Production integrations can degrade safely.
- Slack users receive a useful response even when a provider fails.

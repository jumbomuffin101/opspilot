# OpsPilot Resume and Portfolio Positioning

## One-line project description

OpsPilot is a Slack-native AI engineering operations agent that investigates incidents, audits repositories, coordinates response workflows, and preserves workspace context across Slack and GitHub.

## Two resume bullets

- Built a Slack-native AI engineering operations agent with Slack OAuth, GitHub OAuth, repository selection, assistant conversations, slash commands, interactive actions, PostgreSQL context memory, and deterministic fallback behavior.
- Designed a typed tool-based agent architecture that separates evidence collection, reasoning, Slack presentation, and provider integrations, enabling real GitHub evidence while preserving reliable demo-mode execution.

## Three resume bullets

- Implemented a multi-tenant Slack app with OAuth installation, app mentions, slash commands, direct messages, Slack Agent Experience support, Block Kit actions, and workspace-specific bot-token resolution.
- Built incident investigation and repository audit workflows using strict TypeScript, modular evidence tools, OpenAI structured reasoning, deterministic fallbacks, and PostgreSQL-backed context storage.
- Added production-oriented setup, documentation, QA checks, security notes, and automated tests covering Slack signing, intent routing, direct-message filtering, and repository risk heuristics.

## LinkedIn project description

OpsPilot is a Slack-native AI incident response and repository intelligence agent built for the Slack Agent Builder Challenge. It installs into a Slack workspace, connects GitHub per workspace, investigates incidents, audits recent code changes, answers follow-up questions, opens incident rooms, drafts postmortems, and stores durable context with PostgreSQL.

## GitHub repository description

Slack-native AI engineering operations agent for incident investigation, repository audit, GitHub evidence, interactive response workflows, and persistent workspace context.

## Technology list

- Next.js App Router
- React
- TypeScript
- Slack Platform, Block Kit, Slack Web API, Agents & AI Apps
- GitHub OAuth and REST API
- OpenAI structured reasoning
- PostgreSQL
- Tailwind CSS
- Vercel
- Node.js test runner

## Key interview talking points

- Why Slack is the primary interface instead of a dashboard.
- How the tool registry isolates provider integrations from reasoning and UI.
- How deterministic fallback keeps demos and incident workflows reliable.
- How workspace-specific OAuth tokens prevent one global GitHub token from becoming the only production path.
- How PostgreSQL context memory supports serverless deployments and follow-up questions.
- How repository audit is intentionally separate from incident response to avoid misleading SEV/customer-impact language.

## Architecture decisions worth discussing

- Slack-first product interface.
- Tool-based agent architecture.
- Provider source priority: workspace token, environment fallback, deterministic mock fallback.
- Structured OpenAI output with validation and deterministic fallback.
- Persistent context keyed by workspace, channel, and thread.
- Vercel App Router route handlers for Slack, OAuth, setup, and health endpoints.

## Hardest technical challenges

- Preserving Slack's fast acknowledgement requirements while performing longer investigations asynchronously.
- Keeping Slack Block Kit output concise while still showing enough evidence for trust.
- Supporting multiple Slack entry points without duplicating intent routing.
- Balancing real integrations with deterministic hackathon demo reliability.
- Avoiding workspace data leakage across Slack teams, channels, threads, and GitHub repositories.

## Truthful measurable outcomes

- Supports multiple Slack entry points: Agent Experience, direct messages, app mentions, slash commands, and interactive buttons.
- Supports two distinct workflows: incident investigation and repository audit.
- Includes automated checks for TypeScript, linting, production build, and unit tests.
- Provides deterministic demo mode for repeatable judging and portfolio walkthroughs.

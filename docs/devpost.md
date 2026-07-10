# OpsPilot — Devpost Submission Copy

## Project summary

OpsPilot is an AI Incident Commander that lives in Slack. One slash command turns an operational report into a concise incident brief with severity, impact, correlated evidence, likely root causes, practical next actions, owners, and an update deadline. Interactive buttons then create an incident room, draft a postmortem, or mark the incident resolved.

## Inspiration

The first minutes of an incident are usually spent searching across conversations, commits, deployments, dashboards, and ownership records while the customer impact continues. The information exists, but it is fragmented. We built OpsPilot to assemble that context where responders already coordinate: Slack.

## What it does

A responder runs:

```text
/opspilot investigate checkout API returning 500 errors after latest deploy
```

OpsPilot acknowledges immediately, gathers evidence through independent tools, and posts an incident brief containing:

- Estimated severity, affected service, status, and confidence
- Customer and operational impact
- Slack, deployment, code-change, and observability evidence
- Similar incidents and recent release clues
- Ranked root-cause hypotheses
- Recommended response actions and suggested owners
- A ready-to-post status update and next-update time

From the same message, responders can open an incident room with a kickoff checklist, generate a structured postmortem draft, or publish a resolved update.

OpsPilot also supports repository intelligence. After installing OpsPilot into Slack, a workspace can connect GitHub through OAuth, choose a repository, and ask:

```text
@OpsPilot check my repo for issues
@OpsPilot what should I test?
@OpsPilot write release notes
```

Repository audit mode reviews recent commits, changed files, risky paths, config/security concerns, and validation steps without starting an incident workflow.

## How we built it

OpsPilot uses Next.js App Router route handlers for signed Slack commands and interactions. An incident agent calls an evidence aggregator, which runs five typed tools concurrently: Slack search, GitHub, deployments, incident history, and ownership. Provider responses are normalized before reasoning, keeping the agent independent of individual APIs.

In production mode, OpenAI can generate a JSON Schema-constrained investigation from the collected evidence. The result is independently validated before use. GitHub commit evidence can come from the live REST API, while the Slack search adapter is ready for a configured Real-Time Search endpoint.

Every external integration has a deterministic fallback. Demo mode skips OpenAI, GitHub, RTS, and deployment-provider calls while preserving real Slack delivery and actions. PostgreSQL stores Slack installations, GitHub installations, project configuration, and incident memory when `DATABASE_URL` is configured; the app falls back safely when it is not.

## Challenges

- Acknowledging Slack within its response window while completing investigation work afterward
- Preserving enough incident context in Block Kit button values without persistence
- Keeping a detailed investigation readable within Slack text and block limits
- Validating evolving external API response shapes without weakening TypeScript safety
- Making AI useful without making the live demo dependent on model or network availability

## Accomplishments

- Built a complete command-to-resolution Slack workflow
- Isolated evidence providers behind strongly typed tools
- Added partial-failure aggregation so one broken provider does not stop an investigation
- Added structured AI reasoning with independent validation and deterministic fallback
- Added live GitHub evidence with relevance ranking and safe degradation
- Added Slack OAuth, per-workspace GitHub OAuth, repository picking, and persistent workspace setup
- Added repository audit mode and follow-up repository intelligence
- Created a deterministic checkout outage scenario that demonstrates enterprise incident response clearly
- Kept the application deployable as a standard Vercel Next.js project

## What we learned

Operational agents need predictable failure behavior as much as strong reasoning. The most effective architecture was not a single large prompt; it was a pipeline that makes evidence collection, normalization, reasoning, and presentation independently testable. Slack also rewards concise hierarchy: responders need the next decision first and supporting detail second.

## What's next

- Action idempotency keys and durable audit trails
- Production deployment-provider evidence
- Workspace-specific Slack RTS authorization and citations
- Durable background jobs and retries
- Evaluation suites for AI and deterministic parity
- MCP adapters behind the existing tool registry

## Built with

Slack Platform, Block Kit, Slack Web API, Next.js 16, React 19, TypeScript, Tailwind CSS, OpenAI Responses API, GitHub REST API, and Vercel.

## Track fit

OpsPilot is built specifically for the Slack Agent Builder Challenge. Slack is not a notification target added after the fact; it is the command surface, collaboration surface, action surface, and system of engagement for the entire incident workflow.

## Judging criteria alignment

### Impact

OpsPilot reduces the time between incident report and coordinated response by assembling evidence and ownership in one place.

### Quality of the Slack experience

The workflow uses immediate acknowledgement, readable Block Kit hierarchy, concise evidence, clear update timing, and action buttons that complete real incident tasks.

### Technical implementation

The project uses request-signature verification, strict TypeScript, modular tools, concurrent aggregation, validated structured output, live GitHub integration, RTS-ready mapping, defensive error handling, and Vercel-compatible route handlers.

### Reliability and completeness

Demo mode provides a deterministic end-to-end path without disabling real Slack commands or interactions. Production integrations degrade safely instead of crashing the incident workflow.

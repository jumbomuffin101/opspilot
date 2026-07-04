# OpsPilot

OpsPilot is an AI incident commander designed to live inside Slack. It will bring incident context, deployment evidence, ownership, timelines, and recommended response actions into the channel where responders are already working.

> Submission project for the **Slack Agent Builder Challenge**. Stage 5 routes deterministic incident intelligence through a registry-driven agent tool architecture. OpenAI, MCP, real-time Slack search, and the GitHub API remain intentionally deferred.

## Architecture

OpsPilot uses a modular TypeScript architecture so Slack transport, agent orchestration, service integrations, and domain tools can evolve independently:

```text
Slack interface
      |
      v
Slack handlers ---> Incident agent ---> Deterministic reasoning
                         |
                         v
                Evidence aggregator
                         |
                         v
                    Tool registry
                         |
          +--------------+---------------+
          v              v               v
    Slack history   Deploys/commits   History/ownership
```

The public Next.js page is a product landing page only. Slack remains the primary product interface.

## Folder structure

```text
app/                    Next.js App Router landing page
public/                 Static assets
src/
  agents/               Agent definitions and orchestration boundary
  data/                 Realistic development fixtures
  lib/                  Constants, logging, and shared utilities
  services/             External service configuration and adapters
  slack/                Blocks, commands, actions, and middleware
  tools/                Registry and single-responsibility evidence tools
  types/                Shared domain and integration types
```

## Local development

### Prerequisites

- Node.js 20.9 or newer
- npm 10 or newer

### Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page does not require credentials. Signed Slack command requests require `SLACK_SIGNING_SECRET`, and posting investigation results requires `SLACK_BOT_TOKEN`.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Slack setup

1. Create or open the Slack app used for OpsPilot.
2. Under **OAuth & Permissions**, add these bot token scopes:
   - `commands` — receive `/opspilot` invocations.
   - `chat:write` — post investigations and action results.
   - `channels:manage` — create public incident channels and invite responders.
   - `channels:read` — find and reuse an incident channel when its name already exists.
   - `chat:write.public` — optional, if OpsPilot must post in public channels it has not joined.
3. Install or reinstall the app to the workspace after changing scopes.
4. Under **Slash Commands**, create `/opspilot` and set its request URL to:

   ```text
   https://<your-domain>/api/slack/commands
   ```

5. Copy the app's signing secret and bot token into `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN`.
6. Under **Interactivity & Shortcuts**, enable interactivity and set the request URL to:

   ```text
   https://<your-domain>/api/slack/actions
   ```

For local development, expose the Next.js server through an HTTPS tunnel and use the tunnel URL for the request URL. Never commit real credentials.

Example command:

```text
/opspilot investigate checkout API is failing after latest deploy
```

OpsPilot acknowledges the command immediately, runs a deterministic mock investigation after the response, and posts the result through `chat.postMessage`.

The Stage 4 buttons run in deterministic mock mode:

- **Create Incident Channel** creates or reuses a channel such as `inc-checkout-api-0703`, invites available responders, and posts kickoff and checklist messages.
- **Generate Postmortem** posts the structured mock draft with impact, timeline, root cause, resolution, and follow-ups.
- **Mark Resolved** posts a final status update and post-incident reminders.

## Agent architecture

### Tool system

Every evidence source implements the same `IncidentTool<Result>` contract and receives an `InvestigationQuery`. The default registry contains five independent tools:

- `SlackSearchTool` returns matching historical Slack messages.
- `GitHubTool` returns commit-level code-change signals.
- `DeploymentTool` returns deployment events.
- `IncidentHistoryTool` returns relevant prior incidents.
- `OwnershipTool` returns service teams and responders.

Tools have no knowledge of each other, Slack Block Kit, or deterministic reasoning. Their current implementations read local fixtures; replacing one with a real integration only requires changing that tool's `execute()` implementation.

### Evidence aggregation

`EvidenceAggregator` runs every registered tool concurrently, records execution duration and success or failure, and returns one typed `InvestigationEvidence` object. A failed tool contributes a failure record while successful evidence remains available, so an investigation can continue with partial context.

The incident agent receives only the aggregate and applies the existing deterministic checkout or generic reasoning. Slash-command responses, interactive actions, and Block Kit rendering remain separate from this layer.

### Future MCP compatibility

The tool boundary is intentionally transport-neutral. A future MCP tool, Slack Real-Time Search adapter, GitHub API adapter, or deployment-provider adapter can implement `IncidentTool<Result>` and register with `ToolRegistry` without changing the incident agent or Slack UX. No MCP or external intelligence integration is implemented in this stage.

## Demo intelligence

The primary demo scenario is **checkout API returning HTTP 500 after deployment**. Keyword matching correlates the report with concise enterprise-style fixtures for:

- Slack support and engineering signals
- Production deployment timing
- GitHub-style high-risk commit changes
- Observability evidence
- A similar resolved checkout incident
- Service ownership and responder roles

The resulting Slack message includes:

1. Incident overview, status, severity, and confidence
2. Customer and operational impact
3. Evidence grouped by Slack history, deploy history, code changes, and observability
4. Similar incidents and recent deployments
5. Ranked likely root causes
6. Practical recommended actions and suggested owners
7. A drafted status update and next-update deadline

Reports that do not match the checkout scenario receive a lower-confidence generic investigation with a safe triage checklist. Every result also includes a structured postmortem draft for the future action-handler stage.

## Deployment

The application is compatible with Vercel's zero-configuration Next.js deployment flow:

1. Import the repository into Vercel.
2. Configure the variables listed in `.env.example` for the appropriate environments.
3. Deploy using the default Next.js build command.

Runtime service clients should remain lazily initialized so missing build-time secrets do not break static generation.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SLACK_BOT_TOKEN` | Slack bot authentication |
| `SLACK_SIGNING_SECRET` | Slack request verification |
| `SLACK_APP_TOKEN` | Slack Socket Mode authentication |
| `OPENAI_API_KEY` | Future model access |
| `GITHUB_TOKEN` | GitHub API authentication |
| `GITHUB_OWNER` | Deployment repository owner |
| `GITHUB_REPO` | Deployment repository name |
| `NEXT_PUBLIC_APP_URL` | Public deployment URL |

## Hackathon

OpsPilot is being built for the Slack Agent Builder Challenge. The goal is a Slack-native operational assistant that helps responders establish shared context quickly while retaining clear human ownership of incident decisions.

## Roadmap

- Add idempotency and retry handling for Slack command deliveries
- Implement grounded incident synthesis with OpenAI
- Correlate GitHub deployments with operational signals
- Add Slack search with scoped evidence and citations
- Persist incidents, audit events, and post-incident reports
- Add observability, evaluation, access control, and production hardening

## License

[MIT](LICENSE)

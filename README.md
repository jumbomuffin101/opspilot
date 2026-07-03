# OpsPilot

OpsPilot is an AI incident commander designed to live inside Slack. It will bring incident context, deployment evidence, ownership, timelines, and recommended response actions into the channel where responders are already working.

> Submission project for the **Slack Agent Builder Challenge**. This repository currently contains the production-oriented scaffold only; command handling and AI execution are intentionally deferred.

## Architecture

OpsPilot uses a modular TypeScript architecture so Slack transport, agent orchestration, service integrations, and domain tools can evolve independently:

```text
Slack interface
      │
      ▼
Slack handlers ──► Incident agent ──► Domain tools
                         │                 │
                         ▼                 ▼
                  Service adapters   Incident/deployment data
                  (OpenAI, GitHub,
                   Slack search)
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
  tools/                Incident and deployment tool contracts
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

Open [http://localhost:3000](http://localhost:3000). The environment variables may remain empty while working on the landing page and mock-data scaffold.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Slack setup

Slack app installation and Agent Builder configuration will be documented when the interaction layer is implemented. The intended configuration will use `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_APP_TOKEN`; do not commit real credentials.

No slash commands or interactive actions are registered in this scaffolding stage.

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

- Connect the official Slack agent interaction flow and request verification
- Add incident lifecycle actions and Slack-native Block Kit views
- Implement grounded incident synthesis with OpenAI
- Correlate GitHub deployments with operational signals
- Add Slack search with scoped evidence and citations
- Persist incidents, audit events, and post-incident reports
- Add observability, evaluation, access control, and production hardening

## License

[MIT](LICENSE)

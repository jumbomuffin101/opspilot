# OpsPilot Final QA Checklist

Use this checklist before recording the demo, deploying to production, or submitting to Devpost.

## Build checks

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `git diff --check`

## Slack installation

- [ ] Add to Slack starts `/api/slack/install` or the configured public install URL.
- [ ] Reinstalling the Slack app updates the existing workspace installation row.
- [ ] OAuth redirect URL is configured as `/api/slack/oauth/callback`.
- [ ] Required scopes are present: `commands`, `chat:write`, `channels:manage`, `channels:read`, `groups:read`, `users:read`, `app_mentions:read`.
- [ ] Slash command `/opspilot` points to `/api/slack/commands`.
- [ ] Interactivity points to `/api/slack/actions`.
- [ ] Event Subscriptions point to `/api/slack/events`.
- [ ] `app_mention` bot event is subscribed.
- [ ] Invalid Slack signatures are rejected.

## GitHub

- [ ] GitHub OAuth starts from `/api/github/install?team_id=...`.
- [ ] GitHub callback validates state and redirects to `/setup/github?team_id=...`.
- [ ] GitHub token is stored server-side only.
- [ ] Repository picker loads safe repository metadata only.
- [ ] Selected repository is saved in `project_configs`.
- [ ] Workspace GitHub token is preferred over deployment-wide `GITHUB_TOKEN`.
- [ ] Workspace repository config is preferred over `GITHUB_OWNER` / `GITHUB_REPO`.
- [ ] `/opspilot audit repo` returns a repository audit.
- [ ] Repo follow-ups work: summary, highest risk, test plan, release notes, next steps, runbook, reviewers.

## Incident flow

- [ ] `/opspilot investigate checkout API returning 500 errors after latest deploy` acknowledges quickly.
- [ ] `@OpsPilot investigate checkout failures` responds in a thread.
- [ ] Investigation result includes severity, impact, leading hypothesis, evidence, actions, owners, and next update.
- [ ] `@OpsPilot show evidence` uses the active incident context.
- [ ] `@OpsPilot show timeline` uses the active incident context.
- [ ] `@OpsPilot explain the leading hypothesis` uses the active incident context.
- [ ] `@OpsPilot who owns checkout-api` returns incident owners.
- [ ] Create Incident Channel works or reports missing Slack scopes clearly.
- [ ] Generate Postmortem posts a deterministic draft.
- [ ] Mark Resolved posts a resolved update.

## Web

- [ ] Homepage clearly says OpsPilot is Slack-native.
- [ ] Homepage Add to Slack CTA works.
- [ ] Homepage links to `/commands`.
- [ ] `/commands` includes incident and repository command examples.
- [ ] `/setup` preserves `team_id` and shows the GitHub connection path.
- [ ] `/setup/github` handles missing GitHub connection and repository-picker errors.
- [ ] `/setup/success` shows workspace, repository, and next Slack commands.
- [ ] Slack OAuth and GitHub OAuth error states are user-friendly.
- [ ] Mobile layouts remain readable for homepage, commands, setup, GitHub setup, and success pages.

## Database

- [ ] `DATABASE_URL` is configured in production.
- [ ] Migrations are applied in order:
  - [ ] `001_create_incidents.sql`
  - [ ] `002_create_slack_installations.sql`
  - [ ] `003_create_project_configs.sql`
  - [ ] `004_create_github_installations.sql`
- [ ] `/api/health` reports database status safely.
- [ ] Persistent incident row is created after investigation.
- [ ] Slack installation row is created after Slack OAuth.
- [ ] GitHub installation row is created after GitHub OAuth.
- [ ] Project config row is created after setup.
- [ ] App still works with no `DATABASE_URL` by using in-memory fallback.

## Security

- [ ] No bot tokens, GitHub tokens, OAuth secrets, signing secrets, or database URLs appear in frontend responses.
- [ ] Logs identify fallback/source decisions without secrets.
- [ ] Slack signature verification rejects stale timestamps.
- [ ] Slack OAuth callback does not expose bot tokens.
- [ ] GitHub OAuth state validation rejects invalid or expired state.
- [ ] Setup and repo APIs return only safe metadata.
- [ ] Demo mode never calls OpenAI, GitHub, Slack RTS, or deployment-provider APIs.

## Demo workflow

- [ ] Set `DEMO_MODE=true` for judging reliability.
- [ ] Run `/opspilot help` and confirm command menu is concise.
- [ ] Run `@OpsPilot help` and confirm command menu is concise.
- [ ] Run the checkout incident investigation path.
- [ ] Run Create Incident Channel, Generate Postmortem, and Mark Resolved.
- [ ] Run `/opspilot audit repo`.
- [ ] Run repo follow-ups: `what should I test?`, `explain the highest risk change`, `write release notes`.
- [ ] Confirm repository audit does not use SEV/incident/customer-impact language unless the user starts an incident investigation.

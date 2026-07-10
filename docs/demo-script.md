# OpsPilot — Three-Minute Demo Script

## Setup before recording

- Set `DEMO_MODE=true`.
- Confirm the Slack app is installed and `/opspilot` is configured.
- Confirm the Add to Slack flow redirects through `/api/slack/install` and `/setup`.
- Confirm GitHub OAuth and repository selection have been completed, or keep demo mode enabled for deterministic repository data.
- Confirm command and interactivity URLs point to the deployed application.
- Use a public demo channel where OpsPilot can post.
- Remove or archive any existing `inc-checkout-api-0703` channel if you want to demonstrate fresh channel creation.

## 0:00–0:20 — Opening pitch

**Say:**

“During an outage, responders lose critical minutes searching across Slack, deployments, commits, and ownership records. OpsPilot is an AI Incident Commander that assembles that evidence and coordinates the response without taking the team out of Slack.”

Show the OpsPilot landing page and command guide briefly: Add to Slack, connect GitHub, choose a repo, then work in Slack. Switch immediately to Slack and emphasize that Slack is the primary interface.

## 0:20–0:40 — Start a conversational investigation

Mention OpsPilot:

```text
@OpsPilot investigate checkout API returning 500 errors after latest deploy
```

**Say:**

“A responder reports the issue in natural language. OpsPilot acknowledges the signed app-mention event immediately and investigates asynchronously in a thread. The slash command remains available.”

Point out the requester, issue text, and investigating status.

## 0:40–1:30 — Walk through the investigation

When the incident brief appears, highlight in this order:

1. `SEV-1`, `checkout-api`, investigating status, and confidence.
2. Customer impact across US and EU checkout traffic.
3. The five-minute correlation with release `2.19.0`.
4. The high-risk database pool commit and matching Slack timeout evidence.
5. The similar prior incident resolved through rollback.
6. The first recommended containment action and next-update deadline.

**Say:**

“OpsPilot has converted an ambiguous report into a shared operating picture. It explains what is happening, why it believes that, who should respond, and what the team should do next. In demo mode every evidence source and the reasoning are deterministic, while Slack delivery remains real.”

Ask a follow-up in the same channel:

```text
@OpsPilot explain why you think the database is responsible
```

Show the focused explanation and point out that OpsPilot reused the active incident instead of running another investigation.

Optional repository-intelligence cutaway if you have 15 extra seconds:

```text
@OpsPilot check my repo for issues
@OpsPilot what should I test?
```

Point out that repository audit mode is separate from incident mode: it reviews recent changes, risky files, config/security concerns, and validation steps without labeling the result as an incident.

## 1:30–2:05 — Open the incident room

Click **Open Incident Room**.

Open the channel OpsPilot creates.

**Say:**

“The same investigation now becomes an operational workspace. OpsPilot creates or safely reuses the incident channel, invites available responders, posts the kickoff context, and creates the initial response checklist.”

Show the incident title, impact, requester mention, checklist, and next-update time.

## 2:05–2:30 — Draft the postmortem

Return to the original channel and click **Draft Postmortem**.

**Say:**

“OpsPilot carries the structured investigation forward into a postmortem draft with summary, impact, timeline, probable root cause, resolution, and follow-up work. The draft remains explicitly subject to human validation.”

## 2:30–2:45 — Resolve the incident

Click **Resolve Incident**.

**Say:**

“When recovery is confirmed, OpsPilot publishes a clear resolved update and keeps the follow-up review visible.”

## 2:45–3:00 — Closing impact statement

**Say:**

“OpsPilot compresses the first critical minutes of incident response into one Slack-native workflow: report, investigate, coordinate, document, and resolve. Its tool architecture supports real GitHub and Slack search integrations, while deterministic fallback makes the demo—and the incident workflow—reliable.”

End on the resolved Slack update or a split view of the incident room and OpsPilot landing page.

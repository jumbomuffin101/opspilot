import type { Incident } from "@/src/types/incident";
import type { SlackBlock } from "@/src/types/slack";

/** Builds a small, SDK-independent incident summary for future Slack handlers. */
export function buildIncidentSummaryBlocks(incident: Incident): SlackBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: `${incident.severity} · ${incident.title}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Service:* ${incident.service}\n*Status:* ${incident.status}` },
    },
    { type: "section", text: { type: "mrkdwn", text: incident.summary } },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Incident ID: ${incident.id}` }],
    },
  ];
}

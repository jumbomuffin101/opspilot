import { formatTimestamp, truncate } from "@/src/lib/utils";
import type { IncidentInvestigation } from "@/src/types/incident";
import type { KnownBlock } from "@/src/types/slack";

function escapeMrkdwn(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function bulletList(items: readonly string[]): string {
  return items.map((item) => `• ${escapeMrkdwn(item)}`).join("\n");
}

export function investigationStartedBlocks(issueText: string, requesterId: string): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot is investigating this incident..." },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Issue*\n${escapeMrkdwn(truncate(issueText, 1_500))}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Requester:* <@${requesterId}>\n*Status:* :large_yellow_circle: Investigating`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Correlating the report with mock incident history and deployment evidence.",
        },
      ],
    },
  ];
}

export function investigationResultBlocks(
  investigation: IncidentInvestigation,
): KnownBlock[] {
  const evidence = investigation.evidence.map(
    (item) =>
      `*${item.source}* · ${formatTimestamp(item.capturedAt)}\n${escapeMrkdwn(item.detail)}`,
  );
  const similarIncidents = investigation.similarIncidents.map(
    (incident) =>
      `*${incident.id} · ${escapeMrkdwn(incident.title)}*\n${escapeMrkdwn(incident.resolution)}`,
  );
  const deploymentClues = investigation.recentDeploymentClues.map(
    (deployment) =>
      `*${deployment.service}* · \`${deployment.sha.slice(0, 7)}\` · ${deployment.status}\n${escapeMrkdwn(deployment.summary)} (${formatTimestamp(deployment.deployedAt)})`,
  );
  const owners = investigation.suggestedOwners.map(
    (owner) => `${owner.slackUserId ? `<@${owner.slackUserId}>` : escapeMrkdwn(owner.name)} — ${escapeMrkdwn(owner.role)}`,
  );

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `Incident investigation · ${investigation.severity}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeMrkdwn(investigation.title)}*\n*Suspected service:* \`${investigation.suspectedService}\``,
      },
    },
    { type: "section", text: { type: "mrkdwn", text: `*Summary*\n${escapeMrkdwn(investigation.summary)}` } },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Likely root causes*\n${bulletList(investigation.likelyRootCauses)}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Evidence*\n${evidence.join("\n\n")}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Similar past incidents*\n${similarIncidents.join("\n\n")}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Recent deployment clues*\n${deploymentClues.join("\n\n")}` },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recommended next steps*\n${bulletList(investigation.recommendedNextSteps)}`,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Suggested owners*\n${owners.join("\n")}` },
    },
    {
      type: "actions",
      block_id: "incident_investigation_actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Create Incident Channel", emoji: true },
          action_id: "create_incident_channel",
          value: investigation.suspectedService,
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Generate Postmortem", emoji: true },
          action_id: "generate_postmortem",
          value: investigation.suspectedService,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Mark Resolved", emoji: true },
          action_id: "mark_resolved",
          value: investigation.suspectedService,
          style: "danger",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Deterministic mock investigation · Review evidence before taking action.",
        },
      ],
    },
  ];
}

export function usageBlocks(): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "How to use OpsPilot" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Describe the operational issue after `investigate`.\n\n*Example*\n`/opspilot investigate checkout API is failing after latest deploy`",
      },
    },
  ];
}

export function unknownCommandBlocks(commandName: string): KnownBlock[] {
  const displayedCommand = commandName ? `\`${escapeMrkdwn(commandName)}\`` : "an empty command";

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "Unknown OpsPilot command" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `I don't recognize ${displayedCommand}.\n\n*Available commands*\n• \`investigate <issue>\` — run a mock incident investigation`,
      },
    },
  ];
}

export function investigationErrorBlocks(issueText: string): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot couldn't complete the investigation" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Something went wrong while investigating “${escapeMrkdwn(truncate(issueText, 500))}”. Please try again in a moment.`,
      },
    },
  ];
}

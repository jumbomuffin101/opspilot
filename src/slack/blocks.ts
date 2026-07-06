import {
  formatCompactTimestamp,
  formatConfidenceScore,
  formatIncidentStatus,
  formatSeverity,
  encodeIncidentActionContext,
  toCompactBullets,
  truncateSlackText,
} from "@/src/lib/utils";
import type {
  IncidentEvidence,
  IncidentEvidenceSource,
  IncidentInvestigation,
} from "@/src/types/incident";
import type { KnownBlock } from "@/src/types/slack";
import type { IncidentActionContext } from "@/src/types/slack";

const EVIDENCE_LABELS: Record<IncidentEvidenceSource, string> = {
  slack_history: "Slack history",
  deploy_history: "Deploy history",
  code_change: "Code changes",
  observability: "Observability",
};

function escapeMrkdwn(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function compactBullets(items: readonly string[], maximumItems = 5): string {
  return toCompactBullets(items.map(escapeMrkdwn), maximumItems);
}

function formatEvidenceGroup(source: IncidentEvidenceSource, evidence: IncidentEvidence[]): string {
  const items = evidence
    .filter((item) => item.source === source)
    .map(
      (item) =>
        `*${escapeMrkdwn(item.signal)}* (${formatCompactTimestamp(item.capturedAt)}) — ${escapeMrkdwn(item.detail)}`,
    );

  return items.length > 0 ? `*${EVIDENCE_LABELS[source]}*\n${toCompactBullets(items, 2)}` : "";
}

export function investigationStartedBlocks(issueText: string, requesterId: string): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot is investigating" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Issue*\n${escapeMrkdwn(truncateSlackText(issueText, 1_500))}`,
      },
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
          text: "Correlating Slack context, deployments, code changes, ownership, and incident history.",
        },
      ],
    },
  ];
}

export function investigationResultBlocks(
  investigation: IncidentInvestigation,
  deliveryContext: Pick<IncidentActionContext, "channelId" | "requesterId">,
): KnownBlock[] {
  const actionValue = encodeIncidentActionContext({
    incidentId: investigation.id,
    title: investigation.title,
    service: investigation.service,
    severity: investigation.severity,
    channelId: deliveryContext.channelId,
    requesterId: deliveryContext.requesterId,
  });
  const evidence = (
    ["slack_history", "deploy_history", "code_change", "observability"] as const
  )
    .map((source) => formatEvidenceGroup(source, investigation.evidence))
    .filter(Boolean)
    .join("\n\n");
  const similarIncidents = investigation.similarIncidents.map(
    (incident) =>
      `*${incident.id} · ${incident.severity}* — ${incident.title}\nResolved: ${incident.resolution}`,
  );
  const recentDeployments = investigation.recentDeployments.map((deployment) => {
    const riskyCommit = deployment.commitSignals.find((commit) => commit.risk === "high");
    const codeSignal = riskyCommit
      ? `\nHigh-risk signal: \`${riskyCommit.sha.slice(0, 7)}\` ${riskyCommit.message}`
      : "";

    return `*${deployment.service} ${deployment.version}* · \`${deployment.sha.slice(0, 7)}\` · ${deployment.status}\n${deployment.summary} (${formatCompactTimestamp(deployment.deployedAt)})${codeSignal}`;
  });
  const owners = investigation.suggestedOwners.map(
    (owner) =>
      `${owner.slackUserId ? `<@${owner.slackUserId}>` : escapeMrkdwn(owner.name)} — ${escapeMrkdwn(owner.role)}, ${escapeMrkdwn(owner.team)}`,
  );
  const affectedRegions = investigation.customerImpact.affectedRegions.length
    ? investigation.customerImpact.affectedRegions.join(", ")
    : "Unconfirmed";
  const failedRequests = investigation.customerImpact.estimatedFailedRequests?.toLocaleString(
    "en-US",
  );

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot Incident Brief" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*${escapeMrkdwn(investigation.title)}*\n${formatSeverity(investigation.severity)}  |  ${formatIncidentStatus(investigation.status)}\n*Service:* \`${investigation.service}\`  |  ${formatConfidenceScore(investigation.confidenceScore)}\n*Incident:* ${investigation.id}\n\n${escapeMrkdwn(investigation.summary)}`,
        ),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Impact*\n${escapeMrkdwn(investigation.impact)}\n\n*Customer journey:* ${escapeMrkdwn(investigation.customerImpact.affectedJourney)}\n*Regions:* ${escapeMrkdwn(affectedRegions)}${failedRequests ? ` · *Estimated failed requests:* ${failedRequests}` : ""}`,
        ),
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: truncateSlackText(`*Evidence*\n${evidence}`) },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Similar Incidents*\n${
          similarIncidents.length
            ? truncateSlackText(compactBullets(similarIncidents, 1))
            : "_No close historical match found._"
        }`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recent Deployments*\n${
          recentDeployments.length
            ? truncateSlackText(toCompactBullets(recentDeployments, 1))
            : "_No correlated deployment found in the investigation window._"
        }`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Likely Root Causes*\n${compactBullets(investigation.likelyRootCauses, 3)}`,
        ),
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Recommended Actions*\n${compactBullets(investigation.recommendedActions, 4)}`,
        ),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(`*Suggested Owners*\n${toCompactBullets(owners, 4)}`),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Next update due:* ${formatCompactTimestamp(investigation.nextUpdateDue)}\n\n*Ready-to-post status update*\n>${escapeMrkdwn(investigation.statusUpdate)}`,
        ),
      },
    },
    {
      type: "actions",
      block_id: "incident_investigation_actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open Incident Room", emoji: true },
          action_id: "create_incident_channel",
          value: actionValue,
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Draft Postmortem", emoji: true },
          action_id: "generate_postmortem",
          value: actionValue,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Resolve Incident", emoji: true },
          action_id: "mark_resolved",
          value: actionValue,
          style: "danger",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "OpsPilot synthesis · Human review required before operational changes.",
        },
      ],
    },
  ];
}

export function incidentKickoffBlocks(
  investigation: IncidentInvestigation,
  context: IncidentActionContext,
  actorUserId: string,
): KnownBlock[] {
  const requester = context.requesterId ? `<@${context.requesterId}>` : "Not provided";

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `${investigation.severity} Incident Kickoff` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeMrkdwn(investigation.title)}*\n*Incident:* ${investigation.id}\n*Service:* \`${investigation.service}\`\n*Status:* :large_yellow_circle: Investigating`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Current assessment*\n${escapeMrkdwn(investigation.summary)}\n\n*Impact*\n${escapeMrkdwn(investigation.impact)}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Channel created by <@${actorUserId}> · Original requester: ${requester}`,
        },
      ],
    },
  ];
}

export function incidentChecklistBlocks(investigation: IncidentInvestigation): KnownBlock[] {
  const checklist = investigation.recommendedActions
    .slice(0, 5)
    .map((action) => `:white_large_square: ${escapeMrkdwn(action)}`)
    .join("\n");

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "Initial Response Checklist" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: checklist },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Next update due ${formatCompactTimestamp(investigation.nextUpdateDue)}` },
      ],
    },
  ];
}

export function incidentChannelCreatedBlocks(
  investigation: IncidentInvestigation,
  channelReference: string,
  reused: boolean,
): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: ${reused ? "Reused" : "Created"} ${channelReference} for *${escapeMrkdwn(investigation.title)}*. The kickoff and response checklist are ready.`,
      },
    },
  ];
}

export function postmortemDraftBlocks(investigation: IncidentInvestigation): KnownBlock[] {
  const draft = investigation.postmortemDraft;
  const timeline = draft.timeline
    .slice(0, 6)
    .map(
      (event) =>
        `• *${formatCompactTimestamp(event.timestamp)}* — ${escapeMrkdwn(event.event)} _(${escapeMrkdwn(event.author)})_`,
    )
    .join("\n");

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `Postmortem Draft · ${investigation.id}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Summary*\n${escapeMrkdwn(draft.summary)}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Impact*\n${escapeMrkdwn(draft.impact)}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: truncateSlackText(`*Timeline*\n${timeline}`) },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Root Cause*\n${escapeMrkdwn(draft.rootCause)}\n\n*Resolution*\n${escapeMrkdwn(draft.resolution)}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Follow-up Actions*\n${compactBullets(draft.followUps, 6)}`,
      },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: "Draft from current incident evidence · Validate before publishing." }],
    },
  ];
}

export function resolvedStatusBlocks(
  investigation: IncidentInvestigation,
  actorUserId: string,
): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: `Incident Resolved · ${investigation.id}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeMrkdwn(investigation.title)}*\n*Final status:* :white_check_mark: Resolved\n*Service:* \`${investigation.service}\``,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Summary*\n${escapeMrkdwn(investigation.postmortemDraft.resolution)}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Follow-up reminder*\nConfirm customer metrics are stable, assign follow-up owners, and schedule a post-incident review.",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Marked resolved by <@${actorUserId}> · Generate and review the postmortem within two business days.`,
        },
      ],
    },
  ];
}

export function actionErrorBlocks(title: string, message: string): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:warning: *${escapeMrkdwn(title)}*\n${message}`,
      },
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
        text: `I don't recognize ${displayedCommand}.\n\n*Available commands*\n• \`investigate <issue>\` — investigate an operational issue`,
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
        text: `Something went wrong while investigating "${escapeMrkdwn(truncateSlackText(issueText, 500))}". Please try again in a moment.`,
      },
    },
  ];
}

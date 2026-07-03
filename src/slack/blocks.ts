import {
  formatCompactTimestamp,
  formatConfidenceScore,
  formatSeverity,
  toCompactBullets,
  truncateSlackText,
} from "@/src/lib/utils";
import type {
  IncidentEvidence,
  IncidentEvidenceSource,
  IncidentInvestigation,
} from "@/src/types/incident";
import type { KnownBlock } from "@/src/types/slack";

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

  return items.length > 0 ? `*${EVIDENCE_LABELS[source]}*\n${toCompactBullets(items, 3)}` : "";
}

export function investigationStartedBlocks(issueText: string, requesterId: string): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot is investigating this incident..." },
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
          text: "Correlating the report with mock Slack history, deployments, code changes, and prior incidents.",
        },
      ],
    },
  ];
}

export function investigationResultBlocks(
  investigation: IncidentInvestigation,
): KnownBlock[] {
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
      text: { type: "plain_text", text: "OpsPilot Incident Intelligence" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Incident Overview*\n*${escapeMrkdwn(investigation.title)}*\n${formatSeverity(investigation.severity)} · \`${investigation.service}\` · ${investigation.status}\n*${investigation.id}* · ${formatConfidenceScore(investigation.confidenceScore)}\n\n${escapeMrkdwn(investigation.summary)}`,
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
            ? truncateSlackText(compactBullets(similarIncidents, 2))
            : "_No close historical match found in mock incident history._"
        }`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recent Deployments*\n${
          recentDeployments.length
            ? truncateSlackText(toCompactBullets(recentDeployments, 2))
            : "_No correlated deployment found in the mock window._"
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
          `*Next Update*\nDue ${formatCompactTimestamp(investigation.nextUpdateDue)}\n\n*Draft status update*\n>${escapeMrkdwn(investigation.statusUpdate)}`,
        ),
      },
    },
    {
      type: "actions",
      block_id: "incident_investigation_actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Create Incident Channel", emoji: true },
          action_id: "create_incident_channel",
          value: investigation.id,
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Generate Postmortem", emoji: true },
          action_id: "generate_postmortem",
          value: investigation.id,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Mark Resolved", emoji: true },
          action_id: "mark_resolved",
          value: investigation.id,
          style: "danger",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Deterministic mock intelligence · Review evidence before taking action.",
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
        text: `Something went wrong while investigating "${escapeMrkdwn(truncateSlackText(issueText, 500))}". Please try again in a moment.`,
      },
    },
  ];
}

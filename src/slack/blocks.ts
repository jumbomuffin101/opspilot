import {
  formatCompactTimestamp,
  formatConfidenceScore,
  formatIncidentStatus,
  formatSeverity,
  encodeIncidentActionContext,
  toCompactBullets,
  truncateSlackText,
} from "@/src/lib/utils";
import {
  incidentResponseCommands,
  repositoryIntelligenceCommands,
  slashCommandAlternatives,
} from "@/src/lib/commandGuide";
import type { RepoFollowupResponse } from "@/src/agents/repoFollowupAgent";
import type {
  IncidentEvidence,
  IncidentEvidenceSource,
  IncidentInvestigation,
} from "@/src/types/incident";
import type { RepoAuditChange, RepoAuditResult } from "@/src/types/tools";
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

function formatAuditChange(change: RepoAuditChange): string {
  const files = change.filesChanged.length
    ? `\nFiles: ${change.filesChanged.slice(0, 4).map((file) => `\`${escapeMrkdwn(file)}\``).join(", ")}${change.filesChanged.length > 4 ? `, +${change.filesChanged.length - 4} more` : ""}`
    : "\nFiles: _metadata unavailable_";
  const reasons = change.reasons.length ? `\nSignals: ${change.reasons.slice(0, 2).map(escapeMrkdwn).join("; ")}` : "";

  return `\`${change.sha.slice(0, 7)}\` *${escapeMrkdwn(change.message)}* — ${escapeMrkdwn(change.author)} (${formatCompactTimestamp(change.committedAt)})${files}${reasons}`;
}

function riskLabel(risk: RepoAuditChange["risk"]): string {
  const labels: Record<RepoAuditChange["risk"], string> = {
    high: ":red_circle: High",
    medium: ":large_yellow_circle: Medium",
    low: ":large_blue_circle: Low",
  };

  return labels[risk];
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
  deliveryContext: Pick<
    IncidentActionContext,
    "channelId" | "teamId" | "requesterId" | "threadTs"
  >,
): KnownBlock[] {
  const actionValue = encodeIncidentActionContext({
    incidentId: investigation.id,
    title: investigation.title,
    service: investigation.service,
    severity: investigation.severity,
    channelId: deliveryContext.channelId,
    teamId: deliveryContext.teamId,
    requesterId: deliveryContext.requesterId,
    threadTs: deliveryContext.threadTs,
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

export function repoAuditStartedBlocks(requestText: string, requesterId: string): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot is auditing the repository" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Request*\n${escapeMrkdwn(truncateSlackText(requestText || "Audit the selected repository", 1_000))}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Requester:* <@${requesterId}>\n*Status:* Reviewing recent commits and changed-file metadata`,
      },
    },
  ];
}

export function repoAuditBlocks(result: RepoAuditResult): KnownBlock[] {
  const recentChanges = [
    ...result.highRiskChanges,
    ...result.mediumRiskChanges,
    ...result.lowRiskChanges,
  ].slice(0, 5);
  const highestRisk = result.highRiskChanges.length
    ? result.highRiskChanges.map((change) => `${riskLabel(change.risk)} ${formatAuditChange(change)}`)
    : result.mediumRiskChanges.slice(0, 2).map(
        (change) => `${riskLabel(change.risk)} ${formatAuditChange(change)}`,
      );
  const concerns = [...result.configConcerns, ...result.securityConcerns];

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "Repository Audit" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Repo:* \`${escapeMrkdwn(result.repo.owner)}/${escapeMrkdwn(result.repo.name)}\`\n${formatConfidenceScore(result.confidenceScore)}\n\n*Summary*\n${escapeMrkdwn(result.summary)}`,
        ),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recent Changes Reviewed*\n${recentChanges.length ? toCompactBullets(recentChanges.map(formatAuditChange), 4) : "_No recent commits were available._"}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Highest-Risk Changes*\n${highestRisk.length ? toCompactBullets(highestRisk, 3) : "_No high-risk file patterns were detected._"}`,
        ),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Config/Security Concerns*\n${concerns.length ? compactBullets(concerns, 5) : "_No obvious config or security concerns were found in recent changed-file metadata._"}`,
        ),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Recommended Actions*\n${compactBullets(result.recommendedActions, 5)}`,
        ),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*What OpsPilot could not verify*\n${compactBullets(result.limitations, 4)}`,
        ),
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: result.metadataOnly
            ? "Repository audit · Based on commit metadata and changed-file paths only."
            : "Repository audit · Includes commit metadata and limited small-file content signals.",
        },
      ],
    },
  ];
}

export function repoAuditErrorBlocks(): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot couldn't complete the repository audit" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Something went wrong while reviewing the connected repository. Check GitHub setup or try again in a moment.",
      },
    },
  ];
}

export function repoAuditRiskExplanationBlocks(result: RepoAuditResult): KnownBlock[] {
  const change = result.highRiskChanges[0] ?? result.mediumRiskChanges[0] ?? result.lowRiskChanges[0];
  if (!change) return repoAuditBlocks(result);

  return [
    { type: "header", text: { type: "plain_text", text: "Highest-Risk Repository Change" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `${riskLabel(change.risk)} ${formatAuditChange(change)}\n\n*Why it matters*\n${compactBullets(change.reasons, 4)}`,
        ),
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Suggested validation*\n${compactBullets(result.recommendedActions, 4)}`,
      },
    },
  ];
}

export function repoAuditRecentCommitsBlocks(result: RepoAuditResult): KnownBlock[] {
  const commits = [
    ...result.highRiskChanges,
    ...result.mediumRiskChanges,
    ...result.lowRiskChanges,
  ].slice(0, 8);

  return [
    { type: "header", text: { type: "plain_text", text: "Recent Repository Changes" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          commits.length ? toCompactBullets(commits.map(formatAuditChange), 6) : "_No recent commits were available._",
        ),
      },
    },
  ];
}

export function repoAuditTestPlanBlocks(result: RepoAuditResult): KnownBlock[] {
  return [
    { type: "header", text: { type: "plain_text", text: "What to Test Next" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(compactBullets(result.recommendedActions, 6)),
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Use this as a validation checklist; OpsPilot has not run CI, tests, or production telemetry checks.",
        },
      ],
    },
  ];
}

export function repoAuditSecurityBlocks(result: RepoAuditResult): KnownBlock[] {
  return [
    { type: "header", text: { type: "plain_text", text: "Security and Config Signals" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(
          `*Security concerns*\n${result.securityConcerns.length ? compactBullets(result.securityConcerns, 5) : "_No obvious security-sensitive changed-file patterns were found._"}\n\n*Configuration concerns*\n${result.configConcerns.length ? compactBullets(result.configConcerns, 5) : "_No obvious configuration concerns were found._"}`,
        ),
      },
    },
  ];
}

function commandList(items: readonly { label: string; description: string }[]): string {
  return items.map((item) => `• \`${escapeMrkdwn(item.label)}\` — ${escapeMrkdwn(item.description)}`).join("\n");
}

function repoFollowupBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return [
    { type: "header", text: { type: "plain_text", text: response.title } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(`*${escapeMrkdwn(response.summary)}*\n${compactBullets(response.bullets, 6)}`),
      },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: escapeMrkdwn(response.context) }],
    },
  ];
}

export function repoSummaryBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return repoFollowupBlocks(response);
}

export function riskExplanationBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return repoFollowupBlocks(response);
}

export function testPlanBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return repoFollowupBlocks(response);
}

export function releaseNotesBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return repoFollowupBlocks(response);
}

export function nextStepsBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return repoFollowupBlocks(response);
}

export function runbookBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return repoFollowupBlocks(response);
}

export function reviewOwnersBlocks(response: RepoFollowupResponse): KnownBlock[] {
  return repoFollowupBlocks(response);
}

export function noRepoAuditContextBlocks(): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":information_source: *I need a recent repository audit first.*\nRun `@OpsPilot check my repo for issues` or `/opspilot audit repo`, then ask follow-up questions like `what should I test?`.",
      },
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
        text: "Use `investigate` for operational issues or `audit` for repository health.\n\n*Examples*\n`/opspilot investigate checkout API is failing after latest deploy`\n`/opspilot audit repo`",
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

function conversationalFooter(investigation: IncidentInvestigation): KnownBlock {
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Active incident: *${investigation.id}* · Ask *@OpsPilot* for status, evidence, owners, deployments, timeline, or postmortem.`,
      },
    ],
  };
}

export function conversationalHelpBlocks(): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "Talk to OpsPilot" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Mention me with a natural-language request. Start an incident with:\n`@OpsPilot investigate checkout failures`\n\nReview the connected repository with:\n`@OpsPilot check my repo for issues`",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*During an active incident, ask:*\n• Summarize the current incident\n• Explain the leading hypothesis\n• Show the deployment timeline\n• What evidence supports the conclusion?\n• Who owns checkout-api?\n• Generate an executive summary\n• Draft the postmortem\n• Resolve the incident",
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: "The `/opspilot investigate …` slash command remains available." },
      ],
    },
  ];
}

export function noActiveIncidentBlocks(): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":information_source: *There is no active incident in this channel.*\nStart one with `@OpsPilot investigate <issue>` or `/opspilot investigate <issue>`.",
      },
    },
  ];
}

export function expandedHelpBlocks(): KnownBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpsPilot Help" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Incident Response*\n${commandList(incidentResponseCommands)}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Repository Intelligence*\n${commandList(repositoryIntelligenceCommands)}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Slash command alternatives*\n${commandList(slashCommandAlternatives)}`,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: "OpsPilot remembers the latest incident or repo audit in the current channel/thread." },
      ],
    },
  ];
}

export function conversationalSummaryBlocks(
  investigation: IncidentInvestigation,
  executiveSummary: boolean,
): KnownBlock[] {
  const headline = executiveSummary ? "Executive Incident Summary" : "Current Incident Summary";
  const customerImpact = investigation.customerImpact.estimatedFailedRequests
    ? ` Approximately ${investigation.customerImpact.estimatedFailedRequests.toLocaleString("en-US")} requests are estimated to have failed.`
    : "";

  return [
    { type: "header", text: { type: "plain_text", text: headline } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeMrkdwn(investigation.title)}*\n${formatSeverity(investigation.severity)}  |  ${formatIncidentStatus(investigation.status)}\n\n${escapeMrkdwn(investigation.summary)}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Business impact*\n${escapeMrkdwn(investigation.customerImpact.description)}${customerImpact}\n\n*Current action*\n${escapeMrkdwn(investigation.recommendedActions[0] ?? "Continue validating impact and containment.")}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${formatConfidenceScore(investigation.confidenceScore)} · Next update ${formatCompactTimestamp(investigation.nextUpdateDue)}`,
        },
      ],
    },
    conversationalFooter(investigation),
  ];
}

export function conversationalExplanationBlocks(
  investigation: IncidentInvestigation,
): KnownBlock[] {
  const supportingEvidence = investigation.evidence
    .filter((item) => item.source === "code_change" || item.source === "deploy_history" || item.source === "observability")
    .slice(0, 3)
    .map((item) => `*${escapeMrkdwn(item.signal)}* — ${escapeMrkdwn(item.detail)}`);
  const supportingEvidenceText = supportingEvidence.length
    ? toCompactBullets(supportingEvidence, 3)
    : "_No correlated deploy, code, or observability evidence is available yet._";

  return [
    { type: "header", text: { type: "plain_text", text: "Why this is the leading hypothesis" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Leading hypothesis*\n${escapeMrkdwn(investigation.likelyRootCauses[0] ?? "The root cause is still being validated.")}\n\n*Why OpsPilot thinks this*\n${supportingEvidenceText}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Alternative hypotheses*\n${compactBullets(investigation.likelyRootCauses.slice(1), 2)}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${formatConfidenceScore(investigation.confidenceScore)} · Correlation is not proof; responders should validate before remediation.`,
        },
      ],
    },
    conversationalFooter(investigation),
  ];
}

export function conversationalStatusBlocks(investigation: IncidentInvestigation): KnownBlock[] {
  return [
    { type: "header", text: { type: "plain_text", text: "Incident Status" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${investigation.id} · ${escapeMrkdwn(investigation.title)}*\n${formatIncidentStatus(investigation.status)}  |  ${formatSeverity(investigation.severity)}\n\n>${escapeMrkdwn(investigation.statusUpdate)}`,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Next update due ${formatCompactTimestamp(investigation.nextUpdateDue)}` },
      ],
    },
    conversationalFooter(investigation),
  ];
}

export function conversationalTimelineBlocks(investigation: IncidentInvestigation): KnownBlock[] {
  const timeline = investigation.timeline.slice(0, 8).map(
    (entry) =>
      `*${formatCompactTimestamp(entry.timestamp)}* — ${escapeMrkdwn(entry.event)} _(${escapeMrkdwn(entry.author)})_`,
  );

  return [
    { type: "header", text: { type: "plain_text", text: "Incident Timeline" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: timeline.length ? toCompactBullets(timeline, 8) : "_No timeline events are available yet._",
      },
    },
    conversationalFooter(investigation),
  ];
}

export function conversationalOwnersBlocks(investigation: IncidentInvestigation): KnownBlock[] {
  const owners = investigation.suggestedOwners.map(
    (owner) =>
      `${owner.slackUserId ? `<@${owner.slackUserId}>` : `*${escapeMrkdwn(owner.name)}*`} — ${escapeMrkdwn(owner.role)}, ${escapeMrkdwn(owner.team)}`,
  );

  return [
    { type: "header", text: { type: "plain_text", text: "Suggested Incident Owners" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Service:* \`${investigation.service}\`\n${owners.length ? toCompactBullets(owners, 5) : "_No owner is assigned yet._"}`,
      },
    },
    conversationalFooter(investigation),
  ];
}

export function conversationalDeploymentsBlocks(
  investigation: IncidentInvestigation,
): KnownBlock[] {
  const deployments = investigation.recentDeployments.slice(0, 4).map((deployment) => {
    const riskyCommit = deployment.commitSignals.find((commit) => commit.risk === "high");
    const commit = riskyCommit
      ? `\n↳ High-risk: \`${riskyCommit.sha.slice(0, 7)}\` ${escapeMrkdwn(riskyCommit.message)}`
      : "";
    return `*${deployment.version} · ${escapeMrkdwn(deployment.status)}* — ${formatCompactTimestamp(deployment.deployedAt)}\n${escapeMrkdwn(deployment.summary)}${commit}`;
  });

  return [
    { type: "header", text: { type: "plain_text", text: "Deployment Timeline" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: deployments.length
          ? toCompactBullets(deployments, 4)
          : "_No correlated deployments are available for this incident._",
      },
    },
    conversationalFooter(investigation),
  ];
}

export function conversationalEvidenceBlocks(investigation: IncidentInvestigation): KnownBlock[] {
  const evidence = (
    ["slack_history", "deploy_history", "code_change", "observability"] as const
  )
    .map((source) => formatEvidenceGroup(source, investigation.evidence))
    .filter(Boolean)
    .join("\n\n");

  return [
    { type: "header", text: { type: "plain_text", text: "Supporting Evidence" } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(evidence || "_No supporting evidence is available yet._"),
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `${formatConfidenceScore(investigation.confidenceScore)} · Evidence is grouped by source.` },
      ],
    },
    conversationalFooter(investigation),
  ];
}

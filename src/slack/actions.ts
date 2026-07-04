import { investigateIncidentDeterministically } from "@/src/agents/incidentAgent";
import { logger } from "@/src/lib/logger";
import { buildIncidentChannelName } from "@/src/lib/utils";
import {
  actionErrorBlocks,
  incidentChannelCreatedBlocks,
  incidentChecklistBlocks,
  incidentKickoffBlocks,
  postmortemDraftBlocks,
  resolvedStatusBlocks,
} from "@/src/slack/blocks";
import {
  createChannel,
  formatChannelReference,
  inviteUsersToChannel,
  postMessage,
  SlackApiError,
} from "@/src/slack/client";
import type { IncidentActionPayload } from "@/src/types/slack";

function investigationPrompt(payload: IncidentActionPayload): string {
  return payload.context.service === "checkout-api"
    ? "checkout API returning HTTP 500 after deployment"
    : payload.context.title;
}

async function postActionError(
  channelId: string,
  title: string,
  message: string,
): Promise<void> {
  await postMessage(channelId, actionErrorBlocks(title, message), `OpsPilot: ${title}`);
}

function formatChannelError(error: unknown): string {
  if (!(error instanceof SlackApiError)) {
    return "Slack could not create the incident channel. Please try again or create it manually.";
  }

  if (error.code === "missing_scope" || error.code === "missing_bot_token") {
    return `OpsPilot needs the \`${error.neededScope ?? "channels:manage"}\` scope and may also need \`channels:read\`. Update the app scopes, reinstall it, and try again.`;
  }

  if (error.code === "name_taken_but_channel_not_visible") {
    return "That incident channel already exists, but OpsPilot cannot find it. Add `channels:read`, reinstall the app, or open the existing channel manually.";
  }

  return `Slack returned \`${error.code}\` while creating the incident channel. Please create the channel manually or review the app permissions.`;
}

export async function handleCreateIncidentChannel(
  payload: IncidentActionPayload,
): Promise<void> {
  const investigation = await investigateIncidentDeterministically(investigationPrompt(payload));
  const channelName = buildIncidentChannelName(
    payload.context.service,
    investigation.timeline[0]?.timestamp ?? investigation.nextUpdateDue,
  );

  let incidentChannel;
  try {
    incidentChannel = await createChannel(channelName);
  } catch (error) {
    logger.error("Failed to create or reuse an incident channel", {
      incidentId: payload.context.incidentId,
      error: error instanceof Error ? error.message : String(error),
    });
    await postActionError(
      payload.context.channelId,
      "Incident channel was not created",
      formatChannelError(error),
    );
    return;
  }

  const invitees = [payload.context.requesterId, payload.actorUserId].filter(
    (userId): userId is string => Boolean(userId),
  );
  let inviteFailed = false;
  try {
    await inviteUsersToChannel(incidentChannel.id, invitees);
  } catch (error) {
    inviteFailed = true;
    // Channel setup can continue because the kickoff explicitly mentions the requester.
    logger.warn("Incident channel created, but one or more users could not be invited", {
      incidentId: payload.context.incidentId,
      channelId: incidentChannel.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await postMessage(
      incidentChannel.id,
      incidentKickoffBlocks(investigation, payload.context, payload.actorUserId),
      `${investigation.severity} incident kickoff: ${investigation.title}`,
    );
    await postMessage(
      incidentChannel.id,
      incidentChecklistBlocks(investigation),
      "OpsPilot initial response checklist",
    );
  } catch (error) {
    logger.error("Incident channel is available, but kickoff messages could not be posted", {
      incidentId: payload.context.incidentId,
      channelId: incidentChannel.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await postActionError(
      payload.context.channelId,
      "Incident channel needs attention",
      `${formatChannelReference(incidentChannel.id)} exists, but OpsPilot could not post the kickoff. Invite the app to the channel and confirm it has \`chat:write\`.`,
    );
    return;
  }

  await postMessage(
    payload.context.channelId,
    incidentChannelCreatedBlocks(
      investigation,
      formatChannelReference(incidentChannel.id),
      incidentChannel.reused,
    ),
    `Incident channel ${incidentChannel.name} is ready`,
  );

  if (inviteFailed) {
    await postActionError(
      payload.context.channelId,
      "Responder invitation needs attention",
      `The channel was prepared, but Slack did not allow OpsPilot to invite every responder. The requester is mentioned in ${formatChannelReference(incidentChannel.id)}; verify \`channels:manage\` and invite them manually if needed.`,
    );
  }
}

export async function handleGeneratePostmortem(payload: IncidentActionPayload): Promise<void> {
  const investigation = await investigateIncidentDeterministically(investigationPrompt(payload));
  await postMessage(
    payload.context.channelId,
    postmortemDraftBlocks(investigation),
    `Postmortem draft for ${investigation.id}`,
  );
}

export async function handleMarkResolved(payload: IncidentActionPayload): Promise<void> {
  const investigation = await investigateIncidentDeterministically(investigationPrompt(payload));
  await postMessage(
    payload.context.channelId,
    resolvedStatusBlocks(investigation, payload.actorUserId),
    `${investigation.id} resolved`,
  );
}

export async function dispatchIncidentAction(payload: IncidentActionPayload): Promise<void> {
  switch (payload.actionId) {
    case "create_incident_channel":
      return handleCreateIncidentChannel(payload);
    case "generate_postmortem":
      return handleGeneratePostmortem(payload);
    case "mark_resolved":
      return handleMarkResolved(payload);
  }
}

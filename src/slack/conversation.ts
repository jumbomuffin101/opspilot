import { investigateIncident } from "@/src/agents/incidentAgent";
import {
  getLatestIncidentContext,
  saveIncidentContext,
  updateIncidentStatus,
} from "@/src/agents/persistentIncidentStore";
import { routeConversationalIntent } from "@/src/agents/intentRouter";
import { logger } from "@/src/lib/logger";
import {
  conversationalDeploymentsBlocks,
  conversationalEvidenceBlocks,
  conversationalExplanationBlocks,
  conversationalHelpBlocks,
  conversationalOwnersBlocks,
  conversationalStatusBlocks,
  conversationalSummaryBlocks,
  conversationalTimelineBlocks,
  investigationErrorBlocks,
  investigationResultBlocks,
  investigationStartedBlocks,
  noActiveIncidentBlocks,
  postmortemDraftBlocks,
  resolvedStatusBlocks,
} from "@/src/slack/blocks";
import { postMessage } from "@/src/slack/client";
import type { KnownBlock } from "@/src/types/slack";

export interface ConversationalRequest {
  teamId: string;
  channelId: string;
  userId: string;
  text: string;
  threadTs: string;
}

async function reply(
  request: ConversationalRequest,
  blocks: KnownBlock[],
  fallbackText: string,
): Promise<void> {
  await postMessage(
    request.channelId,
    blocks,
    fallbackText,
    request.threadTs,
  );
}

async function investigateFromConversation(
  request: ConversationalRequest,
  issueText: string,
): Promise<void> {
  if (!issueText) {
    await reply(request, conversationalHelpBlocks(), "How to talk to OpsPilot");
    return;
  }

  await reply(
    request,
    investigationStartedBlocks(issueText, request.userId),
    `OpsPilot is investigating: ${issueText}`,
  );

  try {
    const investigation = await investigateIncident(issueText);
    await saveIncidentContext({
      teamId: request.teamId,
      channelId: request.channelId,
      threadTs: request.threadTs,
      requesterId: request.userId,
      issueText,
      investigation,
    });
    await reply(
      request,
      investigationResultBlocks(investigation, {
        channelId: request.channelId,
        teamId: request.teamId,
        requesterId: request.userId,
        threadTs: request.threadTs,
      }),
      `${investigation.severity}: ${investigation.title}`,
    );
  } catch (error) {
    logger.error("Conversational incident investigation failed", {
      teamId: request.teamId,
      channelId: request.channelId,
      error: error instanceof Error ? error.message : String(error),
    });
    await reply(
      request,
      investigationErrorBlocks(issueText),
      "OpsPilot could not complete the investigation",
    );
  }
}

/** Routes one app mention and responds in the originating Slack thread. */
export async function handleConversationalRequest(
  request: ConversationalRequest,
): Promise<void> {
  const routed = routeConversationalIntent(request.text);
  logger.info("Conversational Slack intent routed", {
    teamId: request.teamId,
    channelId: request.channelId,
    intent: routed.intent,
  });

  if (routed.intent === "help") {
    await reply(request, conversationalHelpBlocks(), "How to talk to OpsPilot");
    return;
  }

  if (routed.intent === "investigate") {
    await investigateFromConversation(request, routed.query);
    return;
  }

  const context = await getLatestIncidentContext(request.teamId, request.channelId);
  if (!context) {
    await reply(
      request,
      noActiveIncidentBlocks(),
      "No active incident. Ask OpsPilot to investigate first.",
    );
    return;
  }

  const investigation = context.investigation;
  switch (routed.intent) {
    case "summarize":
      await reply(
        request,
        conversationalSummaryBlocks(investigation, routed.executiveSummary),
        `Summary of ${investigation.id}`,
      );
      return;
    case "explain":
      await reply(
        request,
        conversationalExplanationBlocks(investigation),
        `Leading hypothesis for ${investigation.id}`,
      );
      return;
    case "status":
      await reply(
        request,
        conversationalStatusBlocks(investigation),
        `Status of ${investigation.id}`,
      );
      return;
    case "timeline":
      await reply(
        request,
        conversationalTimelineBlocks(investigation),
        `Timeline for ${investigation.id}`,
      );
      return;
    case "owner":
      await reply(
        request,
        conversationalOwnersBlocks(investigation),
        `Owners for ${investigation.service}`,
      );
      return;
    case "deployments":
      await reply(
        request,
        conversationalDeploymentsBlocks(investigation),
        `Deployments related to ${investigation.id}`,
      );
      return;
    case "evidence":
      await reply(
        request,
        conversationalEvidenceBlocks(investigation),
        `Evidence for ${investigation.id}`,
      );
      return;
    case "postmortem":
      await reply(
        request,
        postmortemDraftBlocks(investigation),
        `Postmortem draft for ${investigation.id}`,
      );
      return;
    case "resolve": {
      const resolvedContext = await updateIncidentStatus(
        request.teamId,
        request.channelId,
        investigation.id,
        "resolved",
      );
      const resolvedInvestigation = resolvedContext?.investigation ?? {
        ...investigation,
        status: "resolved" as const,
      };
      await reply(
        request,
        resolvedStatusBlocks(resolvedInvestigation, request.userId),
        `${resolvedInvestigation.id} resolved`,
      );
      return;
    }
  }
}

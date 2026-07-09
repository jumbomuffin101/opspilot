import { investigateIncident } from "@/src/agents/incidentAgent";
import {
  getLatestIncidentContext,
  saveIncidentContext,
  updateIncidentStatus,
} from "@/src/agents/persistentIncidentStore";
import { routeConversationalIntent } from "@/src/agents/intentRouter";
import { auditRepository } from "@/src/agents/repoAuditAgent";
import {
  getLatestRepoAuditContext,
  saveRepoAuditContext,
} from "@/src/agents/repoAuditContext";
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
  repoAuditBlocks,
  repoAuditErrorBlocks,
  repoAuditRecentCommitsBlocks,
  repoAuditRiskExplanationBlocks,
  repoAuditSecurityBlocks,
  repoAuditStartedBlocks,
  repoAuditTestPlanBlocks,
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
    request.teamId,
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
    const investigation = await investigateIncident(issueText, { teamId: request.teamId });
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

async function auditFromConversation(
  request: ConversationalRequest,
  requestText: string,
): Promise<void> {
  const auditText = requestText || "audit this repository";
  await reply(
    request,
    repoAuditStartedBlocks(auditText, request.userId),
    `OpsPilot is auditing the repository: ${auditText}`,
  );

  try {
    const audit = await auditRepository(auditText, { teamId: request.teamId });
    await saveRepoAuditContext({
      teamId: request.teamId,
      channelId: request.channelId,
      threadTs: request.threadTs,
      requesterId: request.userId,
      requestText: auditText,
      audit,
    });
    await reply(
      request,
      repoAuditBlocks(audit),
      `Repository audit for ${audit.repo.owner}/${audit.repo.name}`,
    );
  } catch (error) {
    logger.error("Conversational repository audit failed", {
      teamId: request.teamId,
      channelId: request.channelId,
      error: error instanceof Error ? error.message : String(error),
    });
    await reply(request, repoAuditErrorBlocks(), "OpsPilot could not complete the repository audit");
  }
}

function repoAuditFollowUpKind(
  intent: string,
  query: string,
): "risk" | "commits" | "testing" | "security" | null {
  const normalized = query.toLowerCase();
  if (/\b(highest risk|highest-risk|risky|why)\b/.test(normalized) || intent === "explain") {
    return "risk";
  }
  if (/\b(recent commits|recent changes|what changed|commit)\b/.test(normalized)) {
    return "commits";
  }
  if (/\b(test|validate|verification|what should i test)\b/.test(normalized)) {
    return "testing";
  }
  if (/\b(security|auth|oauth|token|secret|permission)\b/.test(normalized)) {
    return "security";
  }
  return null;
}

async function replyFromRepoAuditContext(
  request: ConversationalRequest,
  kind: "risk" | "commits" | "testing" | "security",
): Promise<boolean> {
  const context = await getLatestRepoAuditContext(
    request.teamId,
    request.channelId,
    request.threadTs,
  );
  if (!context) return false;

  const audit = context.audit;
  if (kind === "risk") {
    await reply(request, repoAuditRiskExplanationBlocks(audit), "Highest-risk repository change");
    return true;
  }
  if (kind === "commits") {
    await reply(request, repoAuditRecentCommitsBlocks(audit), "Recent repository commits");
    return true;
  }
  if (kind === "testing") {
    await reply(request, repoAuditTestPlanBlocks(audit), "Repository audit test plan");
    return true;
  }

  await reply(request, repoAuditSecurityBlocks(audit), "Repository security and config signals");
  return true;
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

  const auditFollowUpKind = repoAuditFollowUpKind(routed.intent, routed.query);
  if (auditFollowUpKind && await replyFromRepoAuditContext(request, auditFollowUpKind)) {
    return;
  }

  if (routed.intent === "repo_audit") {
    await auditFromConversation(request, routed.query);
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

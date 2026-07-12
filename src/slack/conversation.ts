import { investigateIncident } from "@/src/agents/incidentAgent";
import {
  getLatestIncidentContext,
  saveIncidentContext,
  updateIncidentStatus,
} from "@/src/agents/persistentIncidentStore";
import { routeConversationalIntent } from "@/src/agents/intentRouter";
import { auditRepository } from "@/src/agents/repoAuditAgent";
import {
  explainHighestRiskChange,
  generateNextSteps,
  generateReleaseNotes,
  generateRepoSummary,
  generateRunbook,
  generateTestPlan,
  suggestReviewOwners,
} from "@/src/agents/repoFollowupAgent";
import {
  getLatestRepoAuditContext,
  saveRepoAuditContext,
} from "@/src/agents/repoAuditContext";
import { logger } from "@/src/lib/logger";
import {
  clearAssistantStatus,
  postAssistantResponse,
  setAssistantStatus,
  setAssistantThreadTitle,
} from "@/src/slack/assistant";
import {
  conversationalDeploymentsBlocks,
  conversationalEvidenceBlocks,
  conversationalExplanationBlocks,
  conversationalOwnersBlocks,
  conversationalStatusBlocks,
  conversationalSummaryBlocks,
  conversationalTimelineBlocks,
  expandedHelpBlocks,
  investigationErrorBlocks,
  investigationResultBlocks,
  investigationStartedBlocks,
  noActiveIncidentBlocks,
  noRepoAuditContextBlocks,
  nextStepsBlocks,
  postmortemDraftBlocks,
  releaseNotesBlocks,
  repoAuditBlocks,
  repoAuditErrorBlocks,
  repoAuditRecentCommitsBlocks,
  repoAuditRiskExplanationBlocks,
  repoAuditSecurityBlocks,
  repoAuditStartedBlocks,
  repoAuditTestPlanBlocks,
  repoSummaryBlocks,
  reviewOwnersBlocks,
  riskExplanationBlocks,
  runbookBlocks,
  testPlanBlocks,
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
  surface?: "mention" | "assistant";
}

async function reply(
  request: ConversationalRequest,
  blocks: KnownBlock[],
  fallbackText: string,
): Promise<void> {
  if (request.surface === "assistant") {
    await postAssistantResponse(
      {
        teamId: request.teamId,
        channelId: request.channelId,
        threadTs: request.threadTs,
      },
      blocks,
      fallbackText,
    );
    return;
  }

  await postMessage(request.channelId, blocks, fallbackText, request.threadTs, request.teamId);
}

async function updateAssistantStatus(
  request: ConversationalRequest,
  status: string,
): Promise<void> {
  if (request.surface !== "assistant") return;

  await setAssistantStatus({
    teamId: request.teamId,
    channelId: request.channelId,
    threadTs: request.threadTs,
    status,
  });
}

async function clearStatus(request: ConversationalRequest): Promise<void> {
  if (request.surface !== "assistant") return;

  await clearAssistantStatus({
    teamId: request.teamId,
    channelId: request.channelId,
    threadTs: request.threadTs,
  });
}

function assistantThreadTitleForIntent(intent: string): string | null {
  if (intent === "investigate") return "Checkout incident investigation";
  if (intent === "repo_audit" || intent === "repo_summary" || intent === "risk_explain") {
    return "OpsPilot repository audit";
  }
  if (intent === "test_plan") return "Release test plan";
  if (intent === "postmortem") return "Incident postmortem";
  if (intent === "release_notes") return "Release notes";
  if (intent === "runbook") return "Rollback runbook";
  return null;
}

async function updateAssistantThreadTitle(
  request: ConversationalRequest,
  intent: string,
): Promise<void> {
  if (request.surface !== "assistant") return;

  const title = assistantThreadTitleForIntent(intent);
  if (!title) return;

  await setAssistantThreadTitle({
    teamId: request.teamId,
    channelId: request.channelId,
    threadTs: request.threadTs,
    title,
  });
}

async function investigateFromConversation(
  request: ConversationalRequest,
  issueText: string,
): Promise<void> {
  if (!issueText) {
    await reply(request, expandedHelpBlocks(), "How to talk to OpsPilot");
    return;
  }

  await updateAssistantStatus(request, "Searching incident context...");
  await reply(
    request,
    investigationStartedBlocks(issueText, request.userId),
    `OpsPilot is investigating: ${issueText}`,
  );

  try {
    await updateAssistantStatus(request, "Reviewing deployments and code changes...");
    const investigation = await investigateIncident(issueText, { teamId: request.teamId });
    await saveIncidentContext({
      teamId: request.teamId,
      channelId: request.channelId,
      threadTs: request.threadTs,
      requesterId: request.userId,
      issueText,
      investigation,
    });
    await updateAssistantStatus(request, "Generating incident brief...");
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
  await updateAssistantStatus(request, "Loading connected repository...");
  await reply(
    request,
    repoAuditStartedBlocks(auditText, request.userId),
    `OpsPilot is auditing the repository: ${auditText}`,
  );

  try {
    await updateAssistantStatus(request, "Reviewing recent commits and changed files...");
    const audit = await auditRepository(auditText, { teamId: request.teamId });
    await saveRepoAuditContext({
      teamId: request.teamId,
      channelId: request.channelId,
      threadTs: request.threadTs,
      requesterId: request.userId,
      requestText: auditText,
      audit,
    });
    await updateAssistantStatus(request, "Preparing risk assessment...");
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
  if (/\b(highest risk|highest-risk|risky commit|commit risky|oauth risk)\b/.test(normalized)) {
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
  logger.info("Repo audit context selected", {
    teamId: request.teamId,
    channelId: request.channelId,
    contextScope: context.threadTs === request.threadTs ? "thread" : "channel",
  });
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

async function replyWithRepoFollowup(
  request: ConversationalRequest,
  intent:
    | "repo_summary"
    | "risk_explain"
    | "test_plan"
    | "release_notes"
    | "next_steps"
    | "runbook"
    | "owners",
): Promise<boolean> {
  const context = await getLatestRepoAuditContext(
    request.teamId,
    request.channelId,
    request.threadTs,
  );
  if (!context) {
    await reply(
      request,
      noRepoAuditContextBlocks(),
      "Run a repository audit first.",
    );
    return true;
  }

  const audit = context.audit;
  logger.info("Repo audit follow-up context selected", {
    teamId: request.teamId,
    channelId: request.channelId,
    contextScope: context.threadTs === request.threadTs ? "thread" : "channel",
  });
  switch (intent) {
    case "repo_summary":
      await reply(request, repoSummaryBlocks(generateRepoSummary(audit)), "Repository summary");
      return true;
    case "risk_explain":
      await reply(
        request,
        riskExplanationBlocks(explainHighestRiskChange(audit)),
        "Repository risk explanation",
      );
      return true;
    case "test_plan":
      await reply(request, testPlanBlocks(generateTestPlan(audit)), "Repository test plan");
      return true;
    case "release_notes":
      await reply(request, releaseNotesBlocks(generateReleaseNotes(audit)), "Release notes");
      return true;
    case "next_steps":
      await reply(request, nextStepsBlocks(generateNextSteps(audit)), "Repository next steps");
      return true;
    case "runbook":
      await reply(request, runbookBlocks(generateRunbook(audit)), "Repository runbook");
      return true;
    case "owners":
      await reply(request, reviewOwnersBlocks(suggestReviewOwners(audit)), "Suggested reviewers");
      return true;
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
    surface: request.surface ?? "mention",
  });

  try {
    await updateAssistantThreadTitle(request, routed.intent);

    if (routed.intent === "help") {
      await reply(request, expandedHelpBlocks(), "How to talk to OpsPilot");
      return;
    }

    if (routed.intent === "investigate") {
      await investigateFromConversation(request, routed.query);
      return;
    }

    if (routed.intent === "repo_audit") {
      await auditFromConversation(request, routed.query);
      return;
    }

    if (
      routed.intent === "repo_summary" ||
      routed.intent === "risk_explain" ||
      routed.intent === "test_plan" ||
      routed.intent === "release_notes" ||
      routed.intent === "next_steps" ||
      routed.intent === "runbook" ||
      routed.intent === "owners"
    ) {
      await updateAssistantStatus(request, "Reviewing the active context...");
      const handled = await replyWithRepoFollowup(request, routed.intent);
      if (handled) return;
    }

    const auditFollowUpKind = repoAuditFollowUpKind(routed.intent, routed.query);
    if (auditFollowUpKind) {
      await updateAssistantStatus(request, "Reviewing the active context...");
    }
    if (auditFollowUpKind && await replyFromRepoAuditContext(request, auditFollowUpKind)) {
      return;
    }

    await updateAssistantStatus(request, "Reviewing the active context...");
    const context = await getLatestIncidentContext(
      request.teamId,
      request.channelId,
      request.threadTs,
    );
    if (!context) {
      await reply(
        request,
        noActiveIncidentBlocks(),
        "No active incident. Ask OpsPilot to investigate first.",
      );
      return;
    }

    const investigation = context.investigation;
    logger.info("Incident context selected", {
      teamId: request.teamId,
      channelId: request.channelId,
      incidentId: investigation.id,
      contextScope: context.threadTs === request.threadTs ? "thread" : "channel",
    });
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
      case "owners":
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
  } finally {
    await clearStatus(request);
  }
}

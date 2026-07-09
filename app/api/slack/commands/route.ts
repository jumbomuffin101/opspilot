import { after, NextResponse } from "next/server";

import { investigateIncident } from "@/src/agents/incidentAgent";
import { saveIncidentContext } from "@/src/agents/persistentIncidentStore";
import { auditRepository } from "@/src/agents/repoAuditAgent";
import {
  generateNextSteps,
  generateReleaseNotes,
  generateRepoSummary,
  generateRunbook,
  generateTestPlan,
} from "@/src/agents/repoFollowupAgent";
import {
  getLatestRepoAuditContext,
  saveRepoAuditContext,
} from "@/src/agents/repoAuditContext";
import { logger } from "@/src/lib/logger";
import {
  expandedHelpBlocks,
  investigationErrorBlocks,
  investigationResultBlocks,
  investigationStartedBlocks,
  nextStepsBlocks,
  noRepoAuditContextBlocks,
  releaseNotesBlocks,
  repoAuditBlocks,
  repoAuditErrorBlocks,
  repoAuditStartedBlocks,
  repoSummaryBlocks,
  runbookBlocks,
  testPlanBlocks,
  unknownCommandBlocks,
  usageBlocks,
} from "@/src/slack/blocks";
import { postMessage } from "@/src/slack/client";
import { parseOpsPilotCommand } from "@/src/slack/commands";
import { verifySlackRequest } from "@/src/slack/middleware";
import type { KnownBlock, SlackSlashCommandPayload } from "@/src/types/slack";

export const runtime = "nodejs";

function slackResponse(blocks: KnownBlock[], responseType: "ephemeral" | "in_channel" = "ephemeral") {
  return NextResponse.json({ response_type: responseType, blocks });
}

function parsePayload(rawBody: string): SlackSlashCommandPayload | null {
  const form = new URLSearchParams(rawBody);
  const command = form.get("command");
  const channelId = form.get("channel_id");
  const teamId = form.get("team_id");
  const userId = form.get("user_id");

  if (!command || !channelId || !teamId || !userId) return null;

  return {
    command,
    text: form.get("text") ?? "",
    channelId,
    teamId,
    userId,
    userName: form.get("user_name") ?? undefined,
    triggerId: form.get("trigger_id") ?? undefined,
  };
}

async function postInvestigation(
  teamId: string,
  channelId: string,
  issueText: string,
  requesterId: string,
): Promise<void> {
  let blocks: KnownBlock[];

  try {
    const investigation = await investigateIncident(issueText, { teamId });
    await saveIncidentContext({
      teamId,
      channelId,
      requesterId,
      issueText,
      investigation,
    });
    blocks = investigationResultBlocks(investigation, {
      channelId,
      teamId,
      requesterId,
    });
  } catch (error) {
    logger.error("Incident investigation failed", {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
    blocks = investigationErrorBlocks(issueText);
  }

  try {
    await postMessage(channelId, blocks, "OpsPilot incident update", undefined, teamId);
  } catch (error) {
    logger.error("Failed to post investigation result to Slack", {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function postRepoAudit(
  teamId: string,
  channelId: string,
  requestText: string,
  requesterId: string,
): Promise<void> {
  let blocks: KnownBlock[];

  try {
    const audit = await auditRepository(requestText, { teamId });
    await saveRepoAuditContext({
      teamId,
      channelId,
      requesterId,
      requestText,
      audit,
    });
    blocks = repoAuditBlocks(audit);
  } catch (error) {
    logger.error("Repository audit failed", {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
    blocks = repoAuditErrorBlocks();
  }

  try {
    await postMessage(channelId, blocks, "OpsPilot repository audit", undefined, teamId);
  } catch (error) {
    logger.error("Failed to post repository audit to Slack", {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getRepoFollowupBlocks(
  teamId: string,
  channelId: string,
  intent: Exclude<Extract<ReturnType<typeof parseOpsPilotCommand>, { type: "repo_followup" }>["intent"], "help">,
): Promise<KnownBlock[]> {
  const context = await getLatestRepoAuditContext(teamId, channelId);
  if (!context) return noRepoAuditContextBlocks();

  const audit = context.audit;
  switch (intent) {
    case "repo_summary":
      return repoSummaryBlocks(generateRepoSummary(audit));
    case "test_plan":
      return testPlanBlocks(generateTestPlan(audit));
    case "release_notes":
      return releaseNotesBlocks(generateReleaseNotes(audit));
    case "next_steps":
      return nextStepsBlocks(generateNextSteps(audit));
    case "runbook":
      return runbookBlocks(generateRunbook(audit));
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const isVerified = verifySlackRequest({
    rawBody,
    signature: request.headers.get("x-slack-signature"),
    timestamp: request.headers.get("x-slack-request-timestamp"),
  });

  if (!isVerified) {
    logger.warn("Rejected an invalid Slack command request");
    return NextResponse.json({ error: "Invalid Slack signature" }, { status: 401 });
  }

  const payload = parsePayload(rawBody);
  if (!payload) {
    logger.warn("Received a malformed Slack command payload");
    return NextResponse.json({ error: "Malformed Slack command payload" }, { status: 400 });
  }

  const command = parseOpsPilotCommand(payload.text);
  if (command.type === "unknown") {
    return slackResponse(unknownCommandBlocks(command.commandName));
  }

  if (command.type === "repo_followup") {
    if (command.intent === "help") {
      return slackResponse(expandedHelpBlocks());
    }

    const blocks = await getRepoFollowupBlocks(
      payload.teamId,
      payload.channelId,
      command.intent,
    );
    return slackResponse(blocks, "in_channel");
  }

  if (command.type === "repo_audit") {
    const requestText = command.query || "audit repo";
    after(() =>
      postRepoAudit(payload.teamId, payload.channelId, requestText, payload.userId),
    );

    return slackResponse(repoAuditStartedBlocks(requestText, payload.userId), "in_channel");
  }

  if (!command.issueText) {
    return slackResponse(usageBlocks());
  }

  after(() =>
    postInvestigation(
      payload.teamId,
      payload.channelId,
      command.issueText,
      payload.userId,
    ),
  );

  return slackResponse(
    investigationStartedBlocks(command.issueText, payload.userId),
    "in_channel",
  );
}

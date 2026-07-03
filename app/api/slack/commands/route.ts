import { after, NextResponse } from "next/server";

import { investigateIncident } from "@/src/agents/incidentAgent";
import { logger } from "@/src/lib/logger";
import {
  investigationErrorBlocks,
  investigationResultBlocks,
  investigationStartedBlocks,
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

async function postInvestigation(channelId: string, issueText: string): Promise<void> {
  let blocks: KnownBlock[];

  try {
    const investigation = await investigateIncident(issueText);
    blocks = investigationResultBlocks(investigation);
  } catch (error) {
    logger.error("Incident investigation failed", {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
    blocks = investigationErrorBlocks(issueText);
  }

  try {
    await postMessage(channelId, blocks);
  } catch (error) {
    logger.error("Failed to post investigation result to Slack", {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
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

  if (!command.issueText) {
    return slackResponse(usageBlocks());
  }

  after(() => postInvestigation(payload.channelId, command.issueText));

  return slackResponse(
    investigationStartedBlocks(command.issueText, payload.userId),
    "in_channel",
  );
}

import { after, NextResponse } from "next/server";

import { logger } from "@/src/lib/logger";
import { decodeIncidentActionContext } from "@/src/lib/utils";
import { dispatchIncidentAction } from "@/src/slack/actions";
import { actionErrorBlocks } from "@/src/slack/blocks";
import { postMessage } from "@/src/slack/client";
import { verifySlackRequest } from "@/src/slack/middleware";
import type {
  IncidentActionId,
  IncidentActionPayload,
  SlackInteractivityPayload,
} from "@/src/types/slack";

export const runtime = "nodejs";

const ACTION_IDS = new Set<IncidentActionId>([
  "create_incident_channel",
  "generate_postmortem",
  "mark_resolved",
]);

function isIncidentActionId(actionId: string): actionId is IncidentActionId {
  return ACTION_IDS.has(actionId as IncidentActionId);
}

function parseSlackPayload(rawBody: string): SlackInteractivityPayload | null {
  const encodedPayload = new URLSearchParams(rawBody).get("payload");
  if (!encodedPayload) return null;

  try {
    const payload: unknown = JSON.parse(encodedPayload);
    if (!payload || typeof payload !== "object") return null;

    const candidate = payload as Partial<SlackInteractivityPayload>;
    if (
      candidate.type !== "block_actions" ||
      typeof candidate.user?.id !== "string" ||
      !Array.isArray(candidate.actions) ||
      candidate.actions.length === 0
    ) {
      return null;
    }

    return candidate as SlackInteractivityPayload;
  } catch {
    return null;
  }
}

function toIncidentActionPayload(
  payload: SlackInteractivityPayload,
): IncidentActionPayload | null {
  const action = payload.actions[0];
  if (!action || !isIncidentActionId(action.action_id) || !action.value) return null;

  const context = decodeIncidentActionContext(action.value);
  if (!context) return null;

  if (payload.channel?.id && payload.channel.id !== context.channelId) {
    logger.warn("Rejected Slack action with mismatched channel context", {
      payloadChannelId: payload.channel.id,
      contextChannelId: context.channelId,
    });
    return null;
  }

  return {
    actionId: action.action_id,
    context,
    actorUserId: payload.user.id,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const isVerified = verifySlackRequest({
    rawBody,
    signature: request.headers.get("x-slack-signature"),
    timestamp: request.headers.get("x-slack-request-timestamp"),
  });

  if (!isVerified) {
    logger.warn("Rejected an invalid Slack interactivity request");
    return NextResponse.json({ error: "Invalid Slack signature" }, { status: 401 });
  }

  const slackPayload = parseSlackPayload(rawBody);
  const actionPayload = slackPayload ? toIncidentActionPayload(slackPayload) : null;
  if (!actionPayload) {
    logger.warn("Ignored a malformed or unsupported Slack action payload");
    return new NextResponse(null, { status: 200 });
  }

  after(async () => {
    try {
      await dispatchIncidentAction(actionPayload);
    } catch (error) {
      logger.error("Slack incident action failed", {
        actionId: actionPayload.actionId,
        incidentId: actionPayload.context.incidentId,
        error: error instanceof Error ? error.message : String(error),
      });

      try {
        await postMessage(
          actionPayload.context.channelId,
          actionErrorBlocks(
            "OpsPilot action failed",
            "The action could not be completed. Check the Slack app scopes and try again.",
          ),
          "OpsPilot action failed",
          actionPayload.context.threadTs,
        );
      } catch (notificationError) {
        logger.error("Failed to post Slack action error message", {
          actionId: actionPayload.actionId,
          error:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
      }
    }
  });

  return new NextResponse(null, { status: 200 });
}

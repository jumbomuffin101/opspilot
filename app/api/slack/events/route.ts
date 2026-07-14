import { after, NextResponse } from "next/server";

import { logger } from "@/src/lib/logger";
import {
  clearAssistantStatus,
  postAssistantResponse,
  setAssistantSuggestedPrompts,
} from "@/src/slack/assistant";
import { actionErrorBlocks } from "@/src/slack/blocks";
import { handleConversationalRequest } from "@/src/slack/conversation";
import { isBotOrSubtypeMessage, isDirectUserMessage } from "@/src/slack/eventFilters";
import { verifySlackRequest } from "@/src/slack/middleware";
import type {
  SlackEventCallbackEnvelope,
  SlackSupportedEvent,
  SlackUrlVerificationPayload,
} from "@/src/types/slack";

export const runtime = "nodejs";

type SlackEventsPayload = SlackEventCallbackEnvelope | SlackUrlVerificationPayload;
type UnknownRecord = Record<string, unknown>;

interface EventDeduplicationGlobal {
  __opsPilotSlackEventIds?: Map<string, number>;
}

const EVENT_TTL_MS = 10 * 60 * 1_000;
const MAX_PROCESSED_EVENTS = 1_000;
const runtimeGlobal = globalThis as typeof globalThis & EventDeduplicationGlobal;
const processedEventIds =
  runtimeGlobal.__opsPilotSlackEventIds ?? new Map<string, number>();
runtimeGlobal.__opsPilotSlackEventIds = processedEventIds;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function nestedRecord(value: unknown, key: string): UnknownRecord | null {
  if (!isRecord(value)) return null;
  const nested = value[key];
  return isRecord(nested) ? nested : null;
}

function eventChannel(event: UnknownRecord): string | undefined {
  const thread = nestedRecord(event, "assistant_thread");
  return (
    optionalString(event.channel) ??
    optionalString(event.channel_id) ??
    optionalString(thread?.channel) ??
    optionalString(thread?.channel_id)
  );
}

function eventThreadTs(event: UnknownRecord): string | undefined {
  const thread = nestedRecord(event, "assistant_thread");
  return (
    optionalString(event.thread_ts) ??
    optionalString(event.ts) ??
    optionalString(thread?.thread_ts)
  );
}

function eventUser(event: UnknownRecord): string | undefined {
  return optionalString(event.user) ?? optionalString(event.user_id);
}

function parseSupportedEvent(event: UnknownRecord): SlackSupportedEvent | null {
  const type = optionalString(event.type);
  if (!type) return null;

  if (type === "app_mention") {
    const user = eventUser(event);
    const text = optionalString(event.text);
    const channel = eventChannel(event);
    const ts = optionalString(event.ts);
    if (!user || !text || !channel || !ts) return null;

    return {
      type,
      user,
      text,
      channel,
      ts,
      thread_ts: optionalString(event.thread_ts),
      event_ts: optionalString(event.event_ts),
      bot_id: optionalString(event.bot_id),
      subtype: optionalString(event.subtype),
    };
  }

  if (type === "message" || type === "assistant_thread_message") {
    const user = eventUser(event);
    const text = optionalString(event.text);
    const channel = eventChannel(event);
    const ts = optionalString(event.ts);
    const channelType = optionalString(event.channel_type);
    if (!user || !text || !channel || !ts) return null;

    return {
      type,
      user,
      text,
      channel,
      ts,
      thread_ts: optionalString(event.thread_ts),
      event_ts: optionalString(event.event_ts),
      channel_type: channelType,
      bot_id: optionalString(event.bot_id),
      subtype: optionalString(event.subtype),
    };
  }

  if (type === "assistant_thread_started" || type === "assistant_thread_context_changed") {
    const channel = eventChannel(event);
    const threadTs = eventThreadTs(event);
    if (!channel || !threadTs) return null;

    return {
      type,
      channel,
      thread_ts: threadTs,
      user: eventUser(event),
    };
  }

  return null;
}

function parseSlackEventsPayload(rawBody: string): SlackEventsPayload | null {
  try {
    const payload: unknown = JSON.parse(rawBody);
    if (!isRecord(payload) || typeof payload.type !== "string") return null;

    if (payload.type === "url_verification" && typeof payload.challenge === "string") {
      return { type: "url_verification", challenge: payload.challenge };
    }

    if (
      payload.type !== "event_callback" ||
      typeof payload.team_id !== "string" ||
      typeof payload.event_id !== "string" ||
      !isRecord(payload.event)
    ) {
      return null;
    }

    const event = parseSupportedEvent(payload.event);
    if (!event) return null;

    return {
      type: "event_callback",
      team_id: payload.team_id,
      event_id: payload.event_id,
      event_time: typeof payload.event_time === "number" ? payload.event_time : undefined,
      event,
    };
  } catch {
    return null;
  }
}

function isDuplicateEvent(eventId: string): boolean {
  const now = Date.now();
  for (const [id, processedAt] of processedEventIds) {
    if (now - processedAt > EVENT_TTL_MS) processedEventIds.delete(id);
  }

  if (processedEventIds.has(eventId)) return true;
  processedEventIds.set(eventId, now);
  while (processedEventIds.size > MAX_PROCESSED_EVENTS) {
    const oldestEventId = processedEventIds.keys().next().value;
    if (typeof oldestEventId !== "string") break;
    processedEventIds.delete(oldestEventId);
  }
  return false;
}

function hasBotOrSubtype(event: SlackSupportedEvent): boolean {
  return "bot_id" in event && isBotOrSubtypeMessage(event);
}

function isDirectMessageEvent(event: SlackSupportedEvent): boolean {
  return event.type === "message" && isDirectUserMessage(event);
}

function isAssistantThreadMessageEvent(event: SlackSupportedEvent): boolean {
  if (event.type === "assistant_thread_message") return true;
  return false;
}

async function postAssistantFailure(
  teamId: string,
  channelId: string,
  threadTs: string,
): Promise<void> {
  await clearAssistantStatus({ teamId, channelId, threadTs });
  await postAssistantResponse(
    { teamId, channelId, threadTs },
    actionErrorBlocks(
      "OpsPilot could not complete that request",
      "Please try again, or run `/opspilot help` to see supported commands.",
    ),
    "OpsPilot could not complete that request.",
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const isVerified = verifySlackRequest({
    rawBody,
    signature: request.headers.get("x-slack-signature"),
    timestamp: request.headers.get("x-slack-request-timestamp"),
  });

  if (!isVerified) {
    logger.warn("Rejected an invalid Slack Events API request");
    return NextResponse.json({ error: "Invalid Slack signature" }, { status: 401 });
  }

  const payload = parseSlackEventsPayload(rawBody);
  if (!payload) {
    logger.warn("Ignored a malformed or unsupported Slack event payload");
    return new NextResponse(null, { status: 200 });
  }

  if (payload.type === "url_verification") {
    return new NextResponse(payload.challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  logger.info("Slack event received", {
    eventId: payload.event_id,
    teamId: payload.team_id,
    eventType: payload.event.type,
    channelType: "channel_type" in payload.event ? payload.event.channel_type : undefined,
  });

  if (hasBotOrSubtype(payload.event)) {
    logger.info("Ignored Slack bot or subtype message", {
      eventId: payload.event_id,
      eventType: payload.event.type,
      channelId: "channel" in payload.event ? payload.event.channel : undefined,
      subtype: "subtype" in payload.event ? payload.event.subtype : undefined,
      hasBotId: "bot_id" in payload.event ? Boolean(payload.event.bot_id) : false,
    });
    return new NextResponse(null, { status: 200 });
  }

  if (isDuplicateEvent(payload.event_id)) {
    return new NextResponse(null, { status: 200 });
  }

  if (payload.event.type === "assistant_thread_started") {
    const { channel, thread_ts: threadTs } = payload.event;
    after(async () => {
      await setAssistantSuggestedPrompts({
        teamId: payload.team_id,
        channelId: channel,
        threadTs,
      });
    });
    return new NextResponse(null, { status: 200 });
  }

  if (payload.event.type === "assistant_thread_context_changed") {
    logger.info("Slack assistant thread context changed", {
      eventId: payload.event_id,
      teamId: payload.team_id,
      channelId: payload.event.channel,
      threadTs: payload.event.thread_ts,
    });
    return new NextResponse(null, { status: 200 });
  }

  if (
    payload.event.type === "message" &&
    !isDirectMessageEvent(payload.event) &&
    !isAssistantThreadMessageEvent(payload.event)
  ) {
    logger.info("Ignored unsupported Slack message event", {
      eventId: payload.event_id,
      channelId: payload.event.channel,
      channelType: payload.event.channel_type,
    });
    return new NextResponse(null, { status: 200 });
  }

  const channelId = payload.event.channel;
  const threadTs =
    payload.event.type === "app_mention" ||
    payload.event.type === "message" ||
    payload.event.type === "assistant_thread_message"
      ? payload.event.thread_ts ?? payload.event.ts
      : payload.event.thread_ts;
  const userId = "user" in payload.event ? payload.event.user : "unknown";
  const text = "text" in payload.event ? payload.event.text : "";
  const surface = payload.event.type === "app_mention" ? "mention" : "assistant";
  const eventType = payload.event.type;
  const isDirectMessage = isDirectMessageEvent(payload.event);

  if (!threadTs) {
    logger.warn("Ignored Slack conversational event without thread timestamp", {
      eventId: payload.event_id,
      eventType,
      channelId,
    });
    return new NextResponse(null, { status: 200 });
  }

  if (isDirectMessage) {
    logger.info("Slack direct message routed to OpsPilot conversation handler", {
      eventId: payload.event_id,
      teamId: payload.team_id,
      channelId,
      threadTs,
      userId,
    });
  }

  after(async () => {
    try {
      await handleConversationalRequest({
        teamId: payload.team_id,
        channelId,
        userId,
        text,
        threadTs,
        surface,
      });
    } catch (error) {
      logger.error("Failed to handle Slack conversational event", {
        eventId: payload.event_id,
        channelId,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      if (eventType !== "app_mention") {
        await postAssistantFailure(payload.team_id, channelId, threadTs);
      }
    }
  });

  return new NextResponse(null, { status: 200 });
}

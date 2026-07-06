import { after, NextResponse } from "next/server";

import { logger } from "@/src/lib/logger";
import { handleConversationalRequest } from "@/src/slack/conversation";
import { verifySlackRequest } from "@/src/slack/middleware";
import type {
  SlackEventCallbackEnvelope,
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

    const event = payload.event;
    if (
      event.type !== "app_mention" ||
      typeof event.user !== "string" ||
      typeof event.text !== "string" ||
      typeof event.channel !== "string" ||
      typeof event.ts !== "string"
    ) {
      return null;
    }

    return {
      type: "event_callback",
      team_id: payload.team_id,
      event_id: payload.event_id,
      event_time: typeof payload.event_time === "number" ? payload.event_time : undefined,
      event: {
        type: "app_mention",
        user: event.user,
        text: event.text,
        channel: event.channel,
        ts: event.ts,
        thread_ts: typeof event.thread_ts === "string" ? event.thread_ts : undefined,
        event_ts: typeof event.event_ts === "string" ? event.event_ts : undefined,
        bot_id: typeof event.bot_id === "string" ? event.bot_id : undefined,
        subtype: typeof event.subtype === "string" ? event.subtype : undefined,
      },
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

  if (payload.event.bot_id || payload.event.subtype || isDuplicateEvent(payload.event_id)) {
    return new NextResponse(null, { status: 200 });
  }

  after(async () => {
    try {
      await handleConversationalRequest({
        teamId: payload.team_id,
        channelId: payload.event.channel,
        userId: payload.event.user,
        text: payload.event.text,
        threadTs: payload.event.thread_ts ?? payload.event.ts,
      });
    } catch (error) {
      logger.error("Failed to handle Slack app mention", {
        eventId: payload.event_id,
        channelId: payload.event.channel,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return new NextResponse(null, { status: 200 });
}

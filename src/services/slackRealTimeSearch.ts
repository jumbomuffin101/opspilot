import { ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { logger } from "@/src/lib/logger";
import type { InvestigationQuery } from "@/src/tools/base";
import type {
  SlackMessageSignal,
  SlackSearchResult,
} from "@/src/types/tools";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_QUERY_LENGTH = 500;
const UNKNOWN_TIMESTAMP = "1970-01-01T00:00:00.000Z";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return undefined;
}

function readNestedString(
  record: UnknownRecord,
  objectKeys: readonly string[],
  valueKeys: readonly string[],
): string | undefined {
  for (const key of objectKeys) {
    const value = record[key];
    if (isRecord(value)) {
      const nested = readString(value, valueKeys);
      if (nested) return nested;
    }
  }

  return undefined;
}

function readScore(record: UnknownRecord): number | undefined {
  for (const key of ["relevance", "relevance_score", "score"] as const) {
    const value = record[key];
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;

    if (Number.isFinite(parsed)) return Math.min(1, Math.max(0, parsed));
  }

  return undefined;
}

function normalizeTimestamp(value: string | undefined): string {
  if (!value) return UNKNOWN_TIMESTAMP;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1_000;
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? UNKNOWN_TIMESTAMP : date.toISOString();
}

function extractCandidates(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const results = payload.results;
  if (Array.isArray(results)) return results;
  if (isRecord(results) && Array.isArray(results.messages)) return results.messages;

  const messages = payload.messages;
  if (Array.isArray(messages)) return messages;
  if (isRecord(messages) && Array.isArray(messages.matches)) return messages.matches;

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.matches)) return payload.matches;

  return [];
}

function mapMessage(value: unknown): SlackMessageSignal | null {
  if (!isRecord(value)) return null;

  const nestedMessage = isRecord(value.message) ? value.message : undefined;
  const text =
    readString(value, ["content", "text", "message"]) ??
    (nestedMessage ? readString(nestedMessage, ["content", "text"]) : undefined);

  if (!text) return null;

  const channel =
    readString(value, ["channel_name", "channel", "channel_id"]) ??
    readNestedString(value, ["channel"], ["name", "id"]) ??
    "unknown-channel";
  const author =
    readString(value, [
      "author_name",
      "author",
      "user",
      "username",
      "author_user_id",
      "user_id",
    ]) ?? readNestedString(value, ["author", "user"], ["name", "display_name", "id"]);
  const timestamp =
    readString(value, ["message_ts", "timestamp", "ts", "created_at"]) ??
    (nestedMessage
      ? readString(nestedMessage, ["message_ts", "timestamp", "ts", "created_at"])
      : undefined);
  const permalink =
    readString(value, ["permalink", "url"]) ??
    (nestedMessage ? readString(nestedMessage, ["permalink", "url"]) : undefined);
  const relevanceScore = readScore(value);

  return {
    channel,
    author: author ?? "Unknown user",
    text,
    timestamp: normalizeTimestamp(timestamp),
    ...(permalink ? { permalink } : {}),
    ...(relevanceScore !== undefined ? { relevanceScore } : {}),
  };
}

function buildSearchQuery(query: InvestigationQuery): string {
  const issue = query.issue.trim();
  const service = query.service?.trim();
  const includesService =
    service && issue.toLocaleLowerCase().includes(service.toLocaleLowerCase());
  const combined = includesService || !service ? issue : `${issue} ${service}`;

  return combined.slice(0, MAX_QUERY_LENGTH);
}

/**
 * Calls a configured Slack RTS endpoint and maps its evolving response defensively.
 * Runtime configuration is read lazily so builds never require live credentials.
 */
export async function searchSlackRealTime(
  query: InvestigationQuery,
): Promise<SlackSearchResult[] | null> {
  const apiUrl = process.env[ENVIRONMENT_KEYS.slackRtsApiUrl]?.trim();
  const token = process.env[ENVIRONMENT_KEYS.slackRtsToken]?.trim();

  if (!apiUrl || !token) return null;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        query: buildSearchQuery(query),
        content_types: ["messages"],
        limit: 20,
        sort: "score",
        sort_dir: "desc",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn("Slack RTS request failed", { status: response.status });
      return null;
    }

    const payload: unknown = await response.json();
    if (isRecord(payload) && payload.ok === false) {
      logger.warn("Slack RTS API returned an error", {
        error: readString(payload, ["error"]) ?? "unknown_error",
      });
      return null;
    }

    const messages = extractCandidates(payload)
      .map(mapMessage)
      .filter((message): message is SlackMessageSignal => message !== null);

    if (messages.length === 0) {
      logger.warn("Slack RTS returned no usable messages");
      return null;
    }

    return [{ kind: "slackHistory", messages }];
  } catch (error) {
    logger.warn("Slack RTS search failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

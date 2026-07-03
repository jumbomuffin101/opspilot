import type { IncidentSeverity } from "@/src/types/incident";
import type { IncidentActionContext } from "@/src/types/slack";

const SLACK_BUTTON_VALUE_LIMIT = 2_000;
const ACTION_CONTEXT_VERSION = 1;

interface CompactIncidentActionContext {
  v: typeof ACTION_CONTEXT_VERSION;
  i: string;
  t: string;
  s: string;
  z: IncidentSeverity;
  c: string;
  r?: string;
}

export function formatCompactTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(timestamp));
}

export function truncateSlackText(value: string, maximumLength = 2_900): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(0, maximumLength - 1))}…`;
}

export function formatConfidenceScore(score: number): string {
  const boundedScore = Math.min(1, Math.max(0, score));
  return `${Math.round(boundedScore * 100)}% confidence`;
}

export function formatSeverity(severity: IncidentSeverity): string {
  const labels: Record<IncidentSeverity, string> = {
    "SEV-1": ":red_circle: SEV-1 · Critical",
    "SEV-2": ":large_orange_circle: SEV-2 · Major",
    "SEV-3": ":large_yellow_circle: SEV-3 · Moderate",
    "SEV-4": ":large_blue_circle: SEV-4 · Minor",
  };

  return labels[severity];
}

export function toCompactBullets(items: readonly string[], maximumItems = 5): string {
  const visibleItems = items.slice(0, maximumItems);
  const remainingCount = Math.max(0, items.length - visibleItems.length);
  const bullets = visibleItems.map((item) => `• ${item}`);

  if (remainingCount > 0) bullets.push(`• +${remainingCount} more`);
  return bullets.join("\n");
}

export function encodeIncidentActionContext(context: IncidentActionContext): string {
  const compactContext: CompactIncidentActionContext = {
    v: ACTION_CONTEXT_VERSION,
    i: context.incidentId,
    t: context.title,
    s: context.service,
    z: context.severity,
    c: context.channelId,
    ...(context.requesterId ? { r: context.requesterId } : {}),
  };
  const encoded = JSON.stringify(compactContext);

  if (encoded.length > SLACK_BUTTON_VALUE_LIMIT) {
    throw new Error("Incident action context exceeds Slack's button value limit.");
  }

  return encoded;
}

export function decodeIncidentActionContext(value: string): IncidentActionContext | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;

    const context = parsed as Partial<CompactIncidentActionContext>;
    const validSeverity = ["SEV-1", "SEV-2", "SEV-3", "SEV-4"].includes(context.z ?? "");
    const requiredValues = [context.i, context.t, context.s, context.c];
    const hasValidStrings = requiredValues.every(
      (item) => typeof item === "string" && item.length > 0 && item.length <= 300,
    );

    if (
      context.v !== ACTION_CONTEXT_VERSION ||
      !validSeverity ||
      !hasValidStrings ||
      (context.r !== undefined && (typeof context.r !== "string" || context.r.length > 100))
    ) {
      return null;
    }

    return {
      incidentId: context.i as string,
      title: context.t as string,
      service: context.s as string,
      severity: context.z as IncidentSeverity,
      channelId: context.c as string,
      requesterId: context.r,
    };
  } catch {
    return null;
  }
}

export function buildIncidentChannelName(service: string, timestamp: string): string {
  const date = new Date(timestamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const normalizedService = service
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55);

  return `inc-${normalizedService || "service"}-${month}${day}`;
}

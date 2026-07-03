import type { IncidentSeverity } from "@/src/types/incident";

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

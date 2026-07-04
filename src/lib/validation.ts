import type {
  CommitSignal,
  CustomerImpact,
  IncidentEvidence,
  IncidentInvestigation,
  IncidentOwner,
  IncidentTimelineEntry,
  PostmortemDraft,
  RecentDeployment,
  SimilarIncident,
} from "@/src/types/incident";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isSeverity(value: unknown): value is IncidentInvestigation["severity"] {
  return value === "SEV-1" || value === "SEV-2" || value === "SEV-3" || value === "SEV-4";
}

function isStatus(value: unknown): value is IncidentInvestigation["status"] {
  return (
    value === "investigating" ||
    value === "identified" ||
    value === "monitoring" ||
    value === "resolved"
  );
}

function isEvidence(value: unknown): value is IncidentEvidence {
  if (!isRecord(value)) return false;
  const source = value.source;
  const validSource =
    source === "slack_history" ||
    source === "deploy_history" ||
    source === "code_change" ||
    source === "observability";

  return (
    validSource &&
    isNonEmptyString(value.detail) &&
    isTimestamp(value.capturedAt) &&
    isNonEmptyString(value.signal) &&
    isOptionalString(value.url)
  );
}

function isTimelineEntry(value: unknown): value is IncidentTimelineEntry {
  return (
    isRecord(value) &&
    isTimestamp(value.timestamp) &&
    isNonEmptyString(value.event) &&
    isNonEmptyString(value.author)
  );
}

function isOwner(value: unknown): value is IncidentOwner {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.role) &&
    isNonEmptyString(value.team) &&
    isOptionalString(value.slackUserId)
  );
}

function isCustomerImpact(value: unknown): value is CustomerImpact {
  if (!isRecord(value)) return false;
  const failedRequests = value.estimatedFailedRequests;
  const validFailedRequests =
    failedRequests === undefined ||
    (typeof failedRequests === "number" &&
      Number.isFinite(failedRequests) &&
      failedRequests >= 0);

  return (
    isNonEmptyString(value.description) &&
    isStringArray(value.affectedRegions) &&
    isNonEmptyString(value.affectedJourney) &&
    validFailedRequests
  );
}

function isSimilarIncident(value: unknown): value is SimilarIncident {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isSeverity(value.severity) &&
    isTimestamp(value.occurredAt) &&
    isNonEmptyString(value.resolution)
  );
}

function isCommitSignal(value: unknown): value is CommitSignal {
  return (
    isRecord(value) &&
    isNonEmptyString(value.sha) &&
    isNonEmptyString(value.message) &&
    isNonEmptyString(value.author) &&
    (value.risk === "low" || value.risk === "medium" || value.risk === "high") &&
    isStringArray(value.filesChanged)
  );
}

function isRecentDeployment(value: unknown): value is RecentDeployment {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.service) &&
    isNonEmptyString(value.environment) &&
    isNonEmptyString(value.version) &&
    isNonEmptyString(value.status) &&
    isNonEmptyString(value.sha) &&
    isNonEmptyString(value.summary) &&
    isTimestamp(value.deployedAt) &&
    (value.completedAt === undefined || isTimestamp(value.completedAt)) &&
    Array.isArray(value.commitSignals) &&
    value.commitSignals.every(isCommitSignal) &&
    isOptionalString(value.url)
  );
}

function isPostmortemDraft(value: unknown): value is PostmortemDraft {
  return (
    isRecord(value) &&
    isNonEmptyString(value.summary) &&
    isNonEmptyString(value.impact) &&
    isNonEmptyString(value.rootCause) &&
    isNonEmptyString(value.resolution) &&
    Array.isArray(value.timeline) &&
    value.timeline.every(isTimelineEntry) &&
    isStringArray(value.followUps)
  );
}

export function validateIncidentInvestigation(
  value: unknown,
): IncidentInvestigation | null {
  if (!isRecord(value)) return null;
  const confidenceScore = value.confidenceScore;
  const validConfidence =
    typeof confidenceScore === "number" &&
    Number.isFinite(confidenceScore) &&
    confidenceScore >= 0 &&
    confidenceScore <= 1;

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.title) ||
    !isSeverity(value.severity) ||
    !isNonEmptyString(value.service) ||
    !isStatus(value.status) ||
    !isNonEmptyString(value.summary) ||
    !isNonEmptyString(value.impact) ||
    !isStringArray(value.likelyRootCauses) ||
    !Array.isArray(value.evidence) ||
    !value.evidence.every(isEvidence) ||
    !Array.isArray(value.similarIncidents) ||
    !value.similarIncidents.every(isSimilarIncident) ||
    !Array.isArray(value.recentDeployments) ||
    !value.recentDeployments.every(isRecentDeployment) ||
    !isStringArray(value.recommendedActions) ||
    !Array.isArray(value.suggestedOwners) ||
    !value.suggestedOwners.every(isOwner) ||
    !Array.isArray(value.timeline) ||
    !value.timeline.every(isTimelineEntry) ||
    !isNonEmptyString(value.statusUpdate) ||
    !isPostmortemDraft(value.postmortemDraft) ||
    !validConfidence ||
    !isCustomerImpact(value.customerImpact) ||
    !isTimestamp(value.nextUpdateDue)
  ) {
    return null;
  }

  return value as unknown as IncidentInvestigation;
}

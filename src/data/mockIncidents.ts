import type {
  Incident,
  ServiceOwnership,
  SlackIncidentMessage,
} from "@/src/types/incident";

export const mockSlackIncidentMessages: SlackIncidentMessage[] = [
  {
    channel: "#support-escalations",
    author: "Nina Patel",
    text: "Checkout attempts are failing for multiple enterprise accounts in US and EU. Customers reach payment confirmation, then receive an error.",
    timestamp: "2026-07-03T14:08:00.000Z",
  },
  {
    channel: "#team-checkout",
    author: "Noah Williams",
    text: "Seeing db_pool_acquire_timeout in checkout-api immediately after 2.19.0 reached production.",
    timestamp: "2026-07-03T14:10:00.000Z",
  },
  {
    channel: "#inc-checkout-api-2026-0042",
    author: "Maya Chen",
    text: "Prior incident had the same 500 signature. Rolling back the connection-pool change restored checkout traffic.",
    timestamp: "2026-06-28T14:16:00.000Z",
  },
];

export const mockServiceOwnership = [
  {
    service: "checkout-api",
    team: "Checkout Platform",
    slackChannel: "#team-checkout",
    owners: [
      {
        name: "Maya Chen",
        role: "Incident Commander",
        team: "Site Reliability Engineering",
        slackUserId: "U05MAYA",
      },
      {
        name: "Noah Williams",
        role: "Checkout Service Lead",
        team: "Checkout Platform",
        slackUserId: "U06NOAH",
      },
      {
        name: "Elena Garcia",
        role: "Database On-call",
        team: "Data Platform",
        slackUserId: "U07ELENA",
      },
    ],
  },
  {
    service: "unknown-service",
    team: "Platform Operations",
    slackChannel: "#platform-oncall",
    owners: [
      {
        name: "Platform On-call",
        role: "Initial Responder",
        team: "Platform Operations",
      },
      {
        name: "Site Reliability On-call",
        role: "Incident Commander",
        team: "Site Reliability Engineering",
      },
    ],
  },
] satisfies ServiceOwnership[];

export const mockIncidents = [
  {
    id: "INC-2026-0042",
    title: "Checkout API returning HTTP 500 after deployment",
    severity: "SEV-1",
    service: "checkout-api",
    summary:
      "Checkout requests failed after version 2.18.0 changed database connection-pool initialization.",
    status: "resolved",
    impact: "37.4% of checkout requests failed for 14 minutes across US and EU production.",
    customerImpact: {
      description: "Customers could not complete card purchases during the incident window.",
      affectedRegions: ["us-east-1", "eu-west-1"],
      estimatedFailedRequests: 18_420,
      affectedJourney: "Checkout and order confirmation",
    },
    rootCause:
      "A production-only connection-pool default reduced available database connections below peak checkout demand.",
    resolution: "Rolled back to checkout-api 2.17.6 and restored the prior pool configuration.",
    evidence: [
      {
        source: "observability",
        signal: "HTTP 500 rate",
        detail: "HTTP 500 rate increased from 0.08% to 37.4% within four minutes.",
        capturedAt: "2026-06-28T14:07:00.000Z",
      },
      {
        source: "deploy_history",
        signal: "Temporal correlation",
        detail: "checkout-api 2.18.0 completed three minutes before the first alert.",
        capturedAt: "2026-06-28T14:03:00.000Z",
      },
    ],
    recommendedActions: [
      "Add load-tested connection-pool limits to deployment validation.",
      "Canary checkout releases before full production rollout.",
    ],
    timeline: [
      {
        timestamp: "2026-06-28T14:07:00.000Z",
        event: "Checkout HTTP 500 alert crossed the SEV-1 threshold.",
        author: "Observability",
      },
      {
        timestamp: "2026-06-28T14:14:00.000Z",
        event: "Rollback to version 2.17.6 initiated.",
        author: "Maya Chen",
      },
      {
        timestamp: "2026-06-28T14:21:00.000Z",
        event: "Error rate returned below threshold.",
        author: "OpsPilot",
      },
    ],
    owners: mockServiceOwnership[0].owners,
  },
  {
    id: "INC-2026-0039",
    title: "Delayed fulfillment events in the EU region",
    severity: "SEV-2",
    service: "fulfillment-events",
    summary: "A saturated consumer group delayed warehouse updates by up to eleven minutes.",
    status: "resolved",
    impact: "EU warehouse state updates were delayed; order placement remained available.",
    customerImpact: {
      description: "Customers saw delayed fulfillment status updates.",
      affectedRegions: ["eu-west-1"],
      affectedJourney: "Order tracking",
    },
    rootCause: "Consumer autoscaling lagged a regional traffic spike.",
    resolution: "Increased consumer capacity and lowered the autoscaling activation threshold.",
    evidence: [
      {
        source: "observability",
        signal: "Consumer lag",
        detail: "Consumer lag peaked at 84,210 messages in eu-west-1.",
        capturedAt: "2026-06-24T09:18:00.000Z",
      },
    ],
    recommendedActions: ["Load-test regional consumer autoscaling thresholds."],
    timeline: [
      {
        timestamp: "2026-06-24T09:18:00.000Z",
        event: "Regional event-lag alert triggered.",
        author: "Observability",
      },
    ],
    owners: [
      {
        name: "Priya Shah",
        role: "Incident Commander",
        team: "Fulfillment Platform",
      },
    ],
  },
] satisfies Incident[];

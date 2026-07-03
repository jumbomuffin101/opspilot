import type { Incident } from "@/src/types/incident";

export const mockIncidents = [
  {
    id: "INC-2026-0042",
    title: "Checkout API returning HTTP 500 after deployment.",
    severity: "SEV-1",
    service: "checkout-api",
    summary:
      "Checkout requests began failing immediately after version 2.18.0 reached production, blocking order completion for all regions.",
    status: "monitoring",
    evidence: [
      {
        source: "observability",
        detail: "HTTP 500 rate increased from 0.08% to 37.4% within four minutes.",
        capturedAt: "2026-06-28T14:07:00.000Z",
      },
      {
        source: "deployment",
        detail: "checkout-api@2.18.0 completed three minutes before the first alert.",
        capturedAt: "2026-06-28T14:03:00.000Z",
      },
    ],
    recommendedActions: [
      "Keep version 2.17.6 active while error rates stabilize.",
      "Compare database connection configuration between releases.",
      "Run a synthetic checkout before closing the incident.",
    ],
    timeline: [
      {
        timestamp: "2026-06-28T14:07:00.000Z",
        event: "Automated alert posted to #inc-checkout-api.",
        author: "OpsPilot",
      },
      {
        timestamp: "2026-06-28T14:14:00.000Z",
        event: "Rollback to version 2.17.6 initiated.",
        author: "Maya Chen",
      },
      {
        timestamp: "2026-06-28T14:21:00.000Z",
        event: "HTTP 500 rate returned below the alert threshold.",
        author: "OpsPilot",
      },
    ],
    owners: [
      { name: "Maya Chen", role: "Incident Commander", slackUserId: "U05MAYA" },
      { name: "Noah Williams", role: "Checkout Service Lead", slackUserId: "U06NOAH" },
    ],
  },
  {
    id: "INC-2026-0039",
    title: "Delayed fulfillment events in the EU region",
    severity: "SEV-2",
    service: "fulfillment-events",
    summary: "A saturated consumer group delayed warehouse updates by up to eleven minutes.",
    status: "resolved",
    evidence: [
      {
        source: "observability",
        detail: "Consumer lag peaked at 84,210 messages in eu-west-1.",
        capturedAt: "2026-06-24T09:18:00.000Z",
      },
    ],
    recommendedActions: ["Review consumer autoscaling thresholds for regional traffic spikes."],
    timeline: [
      {
        timestamp: "2026-06-24T09:18:00.000Z",
        event: "Regional event-lag alert triggered.",
        author: "OpsPilot",
      },
    ],
    owners: [{ name: "Priya Shah", role: "Incident Commander" }],
  },
] satisfies Incident[];

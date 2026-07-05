import { EvidenceAggregator } from "@/src/agents/evidenceAggregator";
import { APP_DESCRIPTION, APP_NAME, ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { logger } from "@/src/lib/logger";
import { generateIncidentInvestigationWithAI } from "@/src/services/openai";
import { createDefaultToolRegistry } from "@/src/tools";
import type { InvestigationQuery } from "@/src/tools";
import type {
  IncidentEvidence,
  IncidentInvestigation,
  IncidentOwner,
  RecentDeployment,
} from "@/src/types/incident";
import type { InvestigationEvidence } from "@/src/types/tools";

export const incidentAgent = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  capabilities: [
    "incident context synthesis",
    "deployment correlation",
    "response coordination",
  ],
  mode: "ai-with-deterministic-fallback",
} as const;

const evidenceAggregator = new EvidenceAggregator(createDefaultToolRegistry());

const CHECKOUT_SCENARIO_SIGNALS = [
  /\bcheckout(?:-api)?\b/i,
  /\bhttp\s*500\b|\b500s?\b/i,
  /\bdeploy(?:ment|ed)?\b|\brelease\b|\brollout\b/i,
  /\bpayment\b|\border confirmation\b/i,
];

export function isCheckoutApiScenario(issueText: string): boolean {
  const matchingSignals = CHECKOUT_SCENARIO_SIGNALS.filter((pattern) => pattern.test(issueText));
  return /\bcheckout(?:-api)?\b/i.test(issueText) || matchingSignals.length >= 3;
}

function toOwners(evidence: InvestigationEvidence): IncidentOwner[] {
  return evidence.owners.map((owner) => ({
    name: owner.name,
    role: owner.role,
    team: owner.team,
    slackUserId: owner.slackUserId,
  }));
}

function toRecentDeployments(evidence: InvestigationEvidence): RecentDeployment[] {
  return evidence.deployments.slice(0, 2).map((deployment, index) => {
    const deploymentCommits = evidence.commits.filter(
      (commit) => commit.deploymentId === deployment.id,
    );
    const relatedCommits =
      deploymentCommits.length > 0
        ? deploymentCommits
        : index === 0
          ? evidence.commits.slice(0, 3)
          : [];

    return {
      id: deployment.id,
      service: deployment.service,
      environment: deployment.environment,
      version: deployment.version,
      status: deployment.status,
      sha: deployment.sha,
      summary: deployment.summary,
      deployedAt: deployment.deployedAt,
      completedAt: deployment.completedAt,
      url: deployment.url,
      commitSignals: relatedCommits.map((commit) => ({
        sha: commit.sha,
        message: commit.message,
        author: commit.author,
        risk: commit.risk,
        filesChanged: [...commit.filesChanged],
      })),
    };
  });
}

function buildCheckoutEvidence(evidence: InvestigationEvidence): IncidentEvidence[] {
  const recentDeployment = evidence.deployments[0];
  const slackEvidence: IncidentEvidence[] = evidence.slackHistory.map((message) => ({
    source: "slack_history",
    signal: message.channel,
    detail: `${message.author}: ${message.text}`,
    capturedAt: message.timestamp,
    url: message.permalink,
  }));
  const deploymentCommits = evidence.commits.filter(
    (commit) => !recentDeployment || commit.deploymentId === recentDeployment.id,
  );
  const relatedCommits =
    deploymentCommits.length > 0 ? deploymentCommits : evidence.commits.slice(0, 3);
  const codeEvidence: IncidentEvidence[] = relatedCommits
    .map((commit) => ({
      source: "code_change",
      signal: `${commit.risk}-risk commit ${commit.sha.slice(0, 7)}`,
      detail: `${commit.message}; changed ${commit.filesChanged.join(", ")}.`,
      capturedAt: commit.committedAt,
      url: commit.url,
    }));

  return [
    ...slackEvidence,
    {
      source: "observability",
      signal: "Checkout HTTP 500 rate",
      detail: "Error rate rose from 0.1% to 31.8% within five minutes of the production rollout.",
      capturedAt: "2026-07-03T14:09:00.000Z",
    },
    ...(recentDeployment
      ? [
          {
            source: "deploy_history" as const,
            signal: "Five-minute deployment correlation",
            detail: `${recentDeployment.service} ${recentDeployment.version} completed at 14:05 UTC; the first customer-impact signal arrived at 14:08 UTC.`,
            capturedAt: recentDeployment.completedAt ?? recentDeployment.deployedAt,
            url: recentDeployment.url,
          },
        ]
      : []),
    ...codeEvidence,
  ];
}

function confidenceWithPartialEvidence(
  baseline: number,
  evidence: InvestigationEvidence,
): number {
  return Math.max(0.2, baseline - evidence.toolFailures.length * 0.05);
}

function buildCheckoutInvestigation(evidence: InvestigationEvidence): IncidentInvestigation {
  const priorCheckoutIncident = evidence.previousIncidents[0];
  const timeline = [
    {
      timestamp: "2026-07-03T14:05:00.000Z",
      event: "checkout-api 2.19.0 completed production rollout.",
      author: "Release Automation",
    },
    {
      timestamp: "2026-07-03T14:08:00.000Z",
      event: "Support reported checkout failures across enterprise accounts.",
      author: "Nina Patel",
    },
    {
      timestamp: "2026-07-03T14:09:00.000Z",
      event: "Checkout HTTP 500 rate crossed the SEV-1 threshold.",
      author: "Observability",
    },
    {
      timestamp: "2026-07-03T14:12:00.000Z",
      event: "OpsPilot correlated the rollout, pool timeout signature, and prior incident.",
      author: "OpsPilot",
    },
  ];
  const impact =
    "Checkout failures are blocking order completion in US and EU production; payment authorization remains healthy, but orders cannot be finalized.";
  const rootCause =
    "Probable regression in database pool initialization introduced by checkout-api 2.19.0, causing connection acquisition timeouts under production load.";
  const resolution =
    "Pending confirmation. Recommended containment is to halt the rollout and restore version 2.18.1 or the last known-good pool configuration.";

  return {
    id: "INC-DEMO-2026-0703",
    title: "Checkout API returning HTTP 500 after deployment",
    severity: "SEV-1",
    service: "checkout-api",
    status: "investigating",
    summary:
      "Multiple independent signals point to a deployment-related database connection regression in checkout-api 2.19.0.",
    impact,
    likelyRootCauses: [
      "Database pool lifecycle refactor in 2.19.0 is exhausting or failing to reuse production connections.",
      "A production-only pool configuration override is incompatible with the new initialization path.",
      "The runtime image update changed connection or DNS behavior for the database client.",
    ],
    evidence: buildCheckoutEvidence(evidence),
    similarIncidents: priorCheckoutIncident
      ? [
          {
            id: priorCheckoutIncident.id,
            title: priorCheckoutIncident.title,
            severity: priorCheckoutIncident.severity,
            occurredAt: priorCheckoutIncident.occurredAt,
            resolution: priorCheckoutIncident.resolution,
          },
        ]
      : [],
    recentDeployments: toRecentDeployments(evidence),
    recommendedActions: [
      "Pause checkout-api rollouts and compare 2.19.0 against the last known-good production configuration.",
      "Inspect db_pool_acquire_timeout volume, active connections, and pool saturation by region.",
      "Roll back 2.19.0 if synthetic checkout failures continue for five minutes.",
      "Run card and wallet synthetic checkouts in US and EU before moving to monitoring.",
    ],
    suggestedOwners: toOwners(evidence),
    timeline,
    statusUpdate:
      "SEV-1 investigating: checkout HTTP 500s began minutes after the 2.19.0 rollout. The leading hypothesis is a database pool initialization regression. Rollout is being paused while responders validate connection saturation and prepare rollback.",
    postmortemDraft: {
      summary:
        "checkout-api began returning HTTP 500 responses shortly after version 2.19.0 reached production.",
      impact,
      rootCause,
      resolution,
      timeline,
      followUps: [
        "Add production-equivalent connection saturation tests to checkout release gates.",
        "Canary database lifecycle changes by region before global rollout.",
        "Alert on pool acquisition timeouts before customer-facing HTTP errors breach threshold.",
      ],
    },
    confidenceScore: confidenceWithPartialEvidence(0.91, evidence),
    customerImpact: {
      description: "Customers receive an error after payment confirmation and cannot place orders.",
      affectedRegions: ["us-east-1", "eu-west-1"],
      estimatedFailedRequests: 12_680,
      affectedJourney: "Checkout and order confirmation",
    },
    nextUpdateDue: "2026-07-03T14:27:00.000Z",
  };
}

function buildGenericInvestigation(
  issueText: string,
  evidence: InvestigationEvidence,
): IncidentInvestigation {
  const timeline = [
    {
      timestamp: "2026-07-03T14:12:00.000Z",
      event: "Issue reported through /opspilot.",
      author: "Slack requester",
    },
    {
      timestamp: "2026-07-03T14:13:00.000Z",
      event: "Initial triage checklist prepared; service correlation remains unconfirmed.",
      author: "OpsPilot",
    },
  ];
  const impact =
    "Customer and service impact are not yet confirmed. Treat the report as potentially customer-facing until telemetry establishes scope.";
  const rootCause = "Undetermined; insufficient correlated service, deployment, and telemetry evidence.";
  const resolution = "Pending service identification and validation of the first containment action.";

  return {
    id: "INC-DEMO-GENERIC",
    title: `Investigation: ${issueText}`,
    severity: "SEV-3",
    service: "unknown-service",
    status: "investigating",
    summary:
      "OpsPilot could not confidently match this report to a known demo scenario, so it prepared a conservative triage plan.",
    impact,
    likelyRootCauses: [
      "A recent application or configuration change may have introduced the reported behavior.",
      "A downstream dependency may be degraded or timing out.",
      "Resource saturation or regional infrastructure health may be contributing.",
    ],
    evidence: [
      {
        source: "slack_history",
        signal: "Requester report",
        detail: issueText,
        capturedAt: "2026-07-03T14:12:00.000Z",
      },
    ],
    similarIncidents: [],
    recentDeployments: toRecentDeployments(evidence),
    recommendedActions: [
      "Confirm the affected service, environment, region, and customer journey.",
      "Check error rate, latency, saturation, and dependency health for the suspected service.",
      "Review deployments and configuration changes from the previous 60 minutes.",
      "Assign a service owner and define the next update time before making changes.",
    ],
    suggestedOwners: toOwners(evidence),
    timeline,
    statusUpdate:
      "SEV-3 investigating: impact and affected service are not yet confirmed. Platform Operations is validating telemetry, recent changes, and dependency health before selecting containment.",
    postmortemDraft: {
      summary: `Investigation opened for: ${issueText}`,
      impact,
      rootCause,
      resolution,
      timeline,
      followUps: [
        "Document the affected service and measurable customer impact.",
        "Capture the first confirmed causal signal and containment decision.",
      ],
    },
    confidenceScore: confidenceWithPartialEvidence(0.42, evidence),
    customerImpact: {
      description: "Unknown; validation is in progress.",
      affectedRegions: [],
      affectedJourney: "Unconfirmed",
    },
    nextUpdateDue: "2026-07-03T14:28:00.000Z",
  };
}

function buildInvestigationQuery(issueText: string): InvestigationQuery {
  const checkoutScenario = isCheckoutApiScenario(issueText);

  return {
    issue: issueText,
    service: checkoutScenario ? "checkout-api" : "unknown-service",
    severity: checkoutScenario ? "SEV-1" : "SEV-3",
  };
}

function buildDeterministicInvestigation(
  issueText: string,
  evidence: InvestigationEvidence,
): IncidentInvestigation {
  return isCheckoutApiScenario(issueText)
    ? buildCheckoutInvestigation(evidence)
    : buildGenericInvestigation(issueText, evidence);
}

export async function investigateIncidentDeterministically(
  issueText: string,
): Promise<IncidentInvestigation> {
  const evidence = await evidenceAggregator.collect(buildInvestigationQuery(issueText));
  return buildDeterministicInvestigation(issueText, evidence);
}

/** Aggregates evidence, attempts AI reasoning, and always retains deterministic fallback. */
export async function investigateIncident(issueText: string): Promise<IncidentInvestigation> {
  const evidence = await evidenceAggregator.collect(buildInvestigationQuery(issueText));
  const demoMode =
    process.env[ENVIRONMENT_KEYS.demoMode]?.trim().toLowerCase() === "true";

  if (demoMode) {
    logger.info("Incident investigation completed", {
      source: "deterministic",
      reason: "demo_mode",
    });
    return buildDeterministicInvestigation(issueText, evidence);
  }

  const aiInvestigation = await generateIncidentInvestigationWithAI({ issueText, evidence });
  if (aiInvestigation) {
    logger.info("Incident investigation completed", { source: "ai" });
    return aiInvestigation;
  }

  logger.info("Incident investigation completed", {
    source: "deterministic_fallback",
  });
  return buildDeterministicInvestigation(issueText, evidence);
}

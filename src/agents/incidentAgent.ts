import { APP_DESCRIPTION, APP_NAME } from "@/src/lib/constants";
import { mockDeployments } from "@/src/data/mockDeployments";
import { mockIncidents } from "@/src/data/mockIncidents";
import type { IncidentInvestigation } from "@/src/types/incident";

export const incidentAgent = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  capabilities: [
    "incident context synthesis",
    "deployment correlation",
    "response coordination",
  ],
  mode: "deterministic-mock",
} as const;

/**
 * Produces the Stage 2 checkout investigation from fixtures. This intentionally
 * performs no model calls or real-time searches.
 */
export async function investigateIncident(issueText: string): Promise<IncidentInvestigation> {
  const checkoutIncident = mockIncidents.find((incident) => incident.service === "checkout-api");
  const checkoutDeployments = mockDeployments.filter(
    (deployment) => deployment.repository.name === "checkout-api",
  );

  if (!checkoutIncident || checkoutDeployments.length === 0) {
    throw new Error("Checkout investigation fixtures are unavailable.");
  }

  return {
    issueText,
    title: checkoutIncident.title,
    severity: checkoutIncident.severity,
    suspectedService: checkoutIncident.service,
    summary:
      "The checkout failure closely matches a deployment-related regression: production HTTP 500s rose immediately after checkout-api 2.18.0 was released.",
    likelyRootCauses: [
      "A connection-pool configuration change in checkout-api 2.18.0 exhausted or rejected database connections.",
      "The new release introduced an environment-specific configuration mismatch in production.",
      "A downstream dependency became incompatible with the newly deployed checkout build.",
    ],
    evidence: checkoutIncident.evidence,
    similarIncidents: [
      {
        id: checkoutIncident.id,
        title: checkoutIncident.title,
        severity: checkoutIncident.severity,
        resolution: "Rollback to checkout-api 2.17.6 restored the HTTP 500 rate below threshold.",
      },
    ],
    recentDeploymentClues: checkoutDeployments.map((deployment) => ({
      deploymentId: deployment.id,
      service: deployment.repository.name,
      environment: deployment.environment,
      sha: deployment.sha,
      summary: deployment.summary,
      deployedAt: deployment.deployedAt,
      status: deployment.status,
    })),
    recommendedNextSteps: checkoutIncident.recommendedActions,
    suggestedOwners: checkoutIncident.owners,
  };
}

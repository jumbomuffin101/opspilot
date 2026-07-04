import { mockServiceOwnership } from "@/src/data/mockIncidents";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { OwnershipResult } from "@/src/types/tools";

export class OwnershipTool implements IncidentTool<OwnershipResult> {
  readonly name = "ownership";

  async execute(query: InvestigationQuery): Promise<OwnershipResult> {
    const ownership =
      mockServiceOwnership.find((item) => item.service === query.service) ??
      mockServiceOwnership.find((item) => item.service === "unknown-service");

    if (!ownership) {
      return {
        kind: "owners",
        service: query.service ?? "unknown-service",
        team: "Platform Operations",
        slackChannel: "#platform-oncall",
        owners: [],
      };
    }

    return {
      kind: "owners",
      service: ownership.service,
      team: ownership.team,
      slackChannel: ownership.slackChannel,
      owners: ownership.owners.map((owner) => ({ ...owner })),
    };
  }
}

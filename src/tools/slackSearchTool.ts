import { mockSlackIncidentMessages } from "@/src/data/mockIncidents";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { SlackSearchResult } from "@/src/types/tools";

export class SlackSearchTool implements IncidentTool<SlackSearchResult> {
  readonly name = "slack-search";

  async execute(query: InvestigationQuery): Promise<SlackSearchResult> {
    const service = query.service?.toLowerCase();
    const messages = service === "checkout-api" ? mockSlackIncidentMessages : [];

    return {
      kind: "slackHistory",
      messages: messages.map((message) => ({ ...message })),
    };
  }
}

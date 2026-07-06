import { mockSlackIncidentMessages } from "@/src/data/mockIncidents";
import { ENVIRONMENT_KEYS } from "@/src/lib/constants";
import { logger } from "@/src/lib/logger";
import { isDemoMode } from "@/src/lib/utils";
import { searchSlackRealTime } from "@/src/services/slackSearch";
import type { IncidentTool, InvestigationQuery } from "@/src/tools/base";
import type { SlackSearchResult } from "@/src/types/tools";

function getMockResults(query: InvestigationQuery): SlackSearchResult {
  const service = query.service?.toLowerCase();
  const messages = service === "checkout-api" ? mockSlackIncidentMessages : [];

  return {
    kind: "slackHistory",
    messages: messages.map((message) => ({ ...message })),
  };
}

export class SlackSearchTool implements IncidentTool<SlackSearchResult> {
  readonly name = "slack-search";

  async execute(query: InvestigationQuery): Promise<SlackSearchResult> {
    const rtsEnabled =
      process.env[ENVIRONMENT_KEYS.slackRtsEnabled]?.toLowerCase() === "true";
    const apiUrl = process.env[ENVIRONMENT_KEYS.slackRtsApiUrl]?.trim();
    const token = process.env[ENVIRONMENT_KEYS.slackRtsToken]?.trim();

    if (isDemoMode()) {
      logger.info("Demo mode active: SlackSearchTool using mock history");
      return getMockResults(query);
    }

    if (!rtsEnabled || !apiUrl || !token) return getMockResults(query);

    const liveResults = await searchSlackRealTime(query);
    const messages = liveResults?.flatMap((result) => result.messages) ?? [];

    if (messages.length === 0) {
      logger.warn("SlackSearchTool falling back to mock evidence");
      return getMockResults(query);
    }

    return {
      kind: "slackHistory",
      messages,
    };
  }
}

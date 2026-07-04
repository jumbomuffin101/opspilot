import { logger } from "@/src/lib/logger";
import type { InvestigationQuery } from "@/src/tools/base";
import type { ToolRegistry } from "@/src/tools";
import type {
  InvestigationEvidence,
  InvestigationToolResult,
  ToolExecutionFailure,
} from "@/src/types/tools";

interface ToolExecutionSuccess {
  tool: string;
  result: InvestigationToolResult;
}

interface ToolExecutionError {
  tool: string;
  failure: ToolExecutionFailure;
}

type ToolExecutionOutcome = ToolExecutionSuccess | ToolExecutionError;

export class EvidenceAggregator {
  constructor(private readonly registry: ToolRegistry) {}

  async collect(query: InvestigationQuery): Promise<InvestigationEvidence> {
    const outcomes = await Promise.all(
      this.registry.getTools().map(async (tool): Promise<ToolExecutionOutcome> => {
        const startedAt = Date.now();

        try {
          const result = await tool.execute(query);
          const durationMs = Date.now() - startedAt;
          logger.info(`[${tool.name}] ${durationMs}ms`, {
            tool: tool.name,
            durationMs,
            success: true,
          });
          return { tool: tool.name, result };
        } catch (error) {
          const durationMs = Date.now() - startedAt;
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`[${tool.name}] failed after ${durationMs}ms`, {
            tool: tool.name,
            durationMs,
            success: false,
            error: message,
          });
          return { tool: tool.name, failure: { tool: tool.name, message } };
        }
      }),
    );

    const evidence: InvestigationEvidence = {
      slackHistory: [],
      commits: [],
      deployments: [],
      owners: [],
      previousIncidents: [],
      toolFailures: [],
    };

    for (const outcome of outcomes) {
      if ("failure" in outcome) {
        evidence.toolFailures.push(outcome.failure);
        continue;
      }

      switch (outcome.result.kind) {
        case "slackHistory":
          evidence.slackHistory.push(...outcome.result.messages);
          break;
        case "commits":
          evidence.commits.push(...outcome.result.commits);
          break;
        case "deployments":
          evidence.deployments.push(...outcome.result.deployments);
          break;
        case "previousIncidents":
          evidence.previousIncidents.push(...outcome.result.incidents);
          break;
        case "owners":
          evidence.owners.push(...outcome.result.owners);
          break;
      }
    }

    return evidence;
  }
}

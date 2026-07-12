import { logger } from "@/src/lib/logger";
import { callSlackApi, postMessage } from "@/src/slack/client";
import type { KnownBlock } from "@/src/types/slack";

interface AssistantApiResponse {
  ok: boolean;
  error?: string;
  needed?: string;
}

export interface AssistantPrompt {
  title: string;
  message: string;
}

export interface AssistantThreadReference {
  teamId: string;
  channelId: string;
  threadTs: string;
}

const SUGGESTED_PROMPTS: AssistantPrompt[] = [
  {
    title: "Investigate an incident",
    message: "Investigate checkout failures after the latest deploy",
  },
  {
    title: "Audit my repository",
    message: "Check my connected repository for risky changes",
  },
  {
    title: "Create a test plan",
    message: "Review the latest audit and tell me what to test",
  },
  {
    title: "Generate release notes",
    message: "Summarize recent repository changes for release",
  },
];

async function callAssistantApi(
  method: string,
  body: Record<string, unknown>,
  teamId: string,
): Promise<boolean> {
  try {
    await callSlackApi<AssistantApiResponse>(method, body, teamId);
    return true;
  } catch (error) {
    logger.warn("Slack assistant API call failed safely", {
      method,
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function setAssistantStatus({
  teamId,
  channelId,
  threadTs,
  status,
}: AssistantThreadReference & { status: string }): Promise<void> {
  await callAssistantApi(
    "assistant.threads.setStatus",
    {
      channel_id: channelId,
      thread_ts: threadTs,
      status,
    },
    teamId,
  );
}

export async function clearAssistantStatus(
  reference: AssistantThreadReference,
): Promise<void> {
  await setAssistantStatus({ ...reference, status: "" });
}

export async function setAssistantThreadTitle({
  teamId,
  channelId,
  threadTs,
  title,
}: AssistantThreadReference & { title: string }): Promise<void> {
  await callAssistantApi(
    "assistant.threads.setTitle",
    {
      channel_id: channelId,
      thread_ts: threadTs,
      title,
    },
    teamId,
  );
}

export async function setAssistantSuggestedPrompts(
  reference: AssistantThreadReference,
  prompts: readonly AssistantPrompt[] = SUGGESTED_PROMPTS,
): Promise<void> {
  await callAssistantApi(
    "assistant.threads.setSuggestedPrompts",
    {
      channel_id: reference.channelId,
      thread_ts: reference.threadTs,
      prompts: prompts.map((prompt) => ({
        title: prompt.title,
        message: prompt.message,
      })),
    },
    reference.teamId,
  );
}

export async function postAssistantResponse(
  reference: AssistantThreadReference,
  blocks: KnownBlock[],
  fallbackText: string,
): Promise<void> {
  await postMessage(
    reference.channelId,
    blocks,
    fallbackText,
    reference.threadTs,
    reference.teamId,
  );
}

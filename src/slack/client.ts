import type { KnownBlock } from "@/src/types/slack";

interface SlackApiResponse {
  ok: boolean;
  error?: string;
}

export async function postMessage(channel: string, blocks: KnownBlock[]): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not configured.");

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel,
      text: "OpsPilot incident investigation",
      blocks,
      unfurl_links: false,
      unfurl_media: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  const result = (await response.json()) as SlackApiResponse;
  if (!response.ok || !result.ok) {
    throw new Error(`Slack chat.postMessage failed: ${result.error ?? response.statusText}`);
  }
}

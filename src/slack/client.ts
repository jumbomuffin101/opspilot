import { getInstallationByTeam } from "@/src/slack/installationStore";
import type { KnownBlock } from "@/src/types/slack";

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  needed?: string;
}

interface SlackChannel {
  id: string;
  name: string;
}

interface CreateChannelResponse extends SlackApiResponse {
  channel?: SlackChannel;
}

interface ListChannelsResponse extends SlackApiResponse {
  channels?: SlackChannel[];
}

export interface CreatedChannel extends SlackChannel {
  reused: boolean;
}

export class SlackApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly code: string,
    public readonly neededScope?: string,
  ) {
    super(`Slack ${method} failed: ${code}`);
    this.name = "SlackApiError";
  }
}

async function callSlackApi<T extends SlackApiResponse>(
  method: string,
  body: Record<string, unknown>,
  teamId?: string,
): Promise<T> {
  const installation = teamId ? await getInstallationByTeam(teamId) : null;
  const token = installation?.botAccessToken ?? process.env.SLACK_BOT_TOKEN;
  if (!token) throw new SlackApiError(method, "missing_bot_token");

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const result = (await response.json()) as T;

  if (!response.ok || !result.ok) {
    throw new SlackApiError(
      method,
      result.error ?? `http_${response.status}`,
      result.needed,
    );
  }

  return result;
}

export async function postMessage(
  channel: string,
  blocks: KnownBlock[],
  fallbackText = "OpsPilot incident update",
  threadTs?: string,
  teamId?: string,
): Promise<void> {
  await callSlackApi<SlackApiResponse>("chat.postMessage", {
    channel,
    text: fallbackText,
    blocks,
    unfurl_links: false,
    unfurl_media: false,
    ...(threadTs ? { thread_ts: threadTs, reply_broadcast: false } : {}),
  }, teamId);
}

async function findChannelByName(name: string, teamId?: string): Promise<SlackChannel | null> {
  const result = await callSlackApi<ListChannelsResponse>("conversations.list", {
    exclude_archived: true,
    limit: 200,
    types: "public_channel",
  }, teamId);

  return result.channels?.find((channel) => channel.name === name) ?? null;
}

export async function createChannel(name: string, teamId?: string): Promise<CreatedChannel> {
  try {
    const result = await callSlackApi<CreateChannelResponse>("conversations.create", {
      name,
      is_private: false,
    }, teamId);
    if (!result.channel) throw new SlackApiError("conversations.create", "missing_channel");

    return { ...result.channel, reused: false };
  } catch (error) {
    if (!(error instanceof SlackApiError) || error.code !== "name_taken") throw error;

    const existingChannel = await findChannelByName(name, teamId);
    if (!existingChannel) {
      throw new SlackApiError("conversations.create", "name_taken_but_channel_not_visible");
    }

    return { ...existingChannel, reused: true };
  }
}

export async function inviteUsersToChannel(
  channelId: string,
  userIds: readonly string[],
  teamId?: string,
): Promise<void> {
  const users = [...new Set(userIds.filter(Boolean))];
  if (users.length === 0) return;

  try {
    await callSlackApi<SlackApiResponse>("conversations.invite", {
      channel: channelId,
      users: users.join(","),
    }, teamId);
  } catch (error) {
    if (error instanceof SlackApiError && error.code === "already_in_channel") return;
    throw error;
  }
}

export function formatChannelReference(channelId: string): string {
  return `<#${channelId}>`;
}

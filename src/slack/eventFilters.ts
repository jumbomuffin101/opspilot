export interface SlackMessageEventLike {
  type?: string;
  channel_type?: string;
  user?: string;
  text?: string;
  bot_id?: string;
  subtype?: string;
}

export function isDirectUserMessage(event: SlackMessageEventLike): boolean {
  return (
    event.type === "message" &&
    event.channel_type === "im" &&
    Boolean(event.user) &&
    Boolean(event.text) &&
    !event.bot_id &&
    !event.subtype
  );
}

export function isBotOrSubtypeMessage(event: SlackMessageEventLike): boolean {
  return Boolean(event.bot_id || event.subtype);
}

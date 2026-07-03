export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
}

export interface SlackButtonElement {
  type: "button";
  text: { type: "plain_text"; text: string; emoji?: boolean };
  action_id: string;
  value: string;
  style?: "primary" | "danger";
}

export type KnownBlock =
  | { type: "header"; text: SlackTextObject }
  | { type: "section"; text: SlackTextObject }
  | { type: "context"; elements: SlackTextObject[] }
  | { type: "divider" }
  | { type: "actions"; elements: SlackButtonElement[]; block_id?: string };

export interface SlackSlashCommandPayload {
  command: string;
  text: string;
  teamId: string;
  channelId: string;
  userId: string;
  userName?: string;
  triggerId?: string;
}

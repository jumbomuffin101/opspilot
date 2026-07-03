export interface SlackContext {
  teamId: string;
  channelId: string;
  userId: string;
  threadTs?: string;
}

export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
}

export type SlackBlock =
  | { type: "header"; text: SlackTextObject }
  | { type: "section"; text: SlackTextObject }
  | { type: "context"; elements: SlackTextObject[] }
  | { type: "divider" };

export interface SlackHandlerRegistration {
  readonly name: string;
  readonly implemented: false;
}

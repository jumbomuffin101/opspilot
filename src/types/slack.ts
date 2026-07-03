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

export interface IncidentActionContext {
  incidentId: string;
  title: string;
  service: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";
  channelId: string;
  requesterId?: string;
}

export type IncidentActionId =
  | "create_incident_channel"
  | "generate_postmortem"
  | "mark_resolved";

export interface SlackBlockAction {
  type: "button";
  action_id: string;
  value?: string;
  action_ts?: string;
}

export interface SlackInteractivityPayload {
  type: "block_actions";
  user: { id: string; username?: string; name?: string };
  team?: { id: string; domain?: string };
  channel?: { id: string; name?: string };
  actions: SlackBlockAction[];
  response_url?: string;
  trigger_id?: string;
}

export interface IncidentActionPayload {
  actionId: IncidentActionId;
  context: IncidentActionContext;
  actorUserId: string;
}

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
  teamId?: string;
  requesterId?: string;
  threadTs?: string;
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

export type ConversationalIntent =
  | "investigate"
  | "summarize"
  | "explain"
  | "status"
  | "timeline"
  | "owner"
  | "deployments"
  | "evidence"
  | "postmortem"
  | "resolve"
  | "repo_audit"
  | "repo_summary"
  | "risk_explain"
  | "test_plan"
  | "release_notes"
  | "owners"
  | "next_steps"
  | "runbook"
  | "help";

export interface RoutedConversationalIntent {
  intent: ConversationalIntent;
  query: string;
  executiveSummary: boolean;
}

export interface SlackAppMentionEvent {
  type: "app_mention";
  user: string;
  text: string;
  channel: string;
  ts: string;
  thread_ts?: string;
  event_ts?: string;
  bot_id?: string;
  subtype?: string;
}

export interface SlackEventCallbackEnvelope {
  type: "event_callback";
  team_id: string;
  event_id: string;
  event_time?: number;
  event: SlackAppMentionEvent;
}

export interface SlackUrlVerificationPayload {
  type: "url_verification";
  challenge: string;
}

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  thread_ts TEXT,
  title TEXT NOT NULL,
  service TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  investigation_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT incidents_workspace_channel_incident_unique UNIQUE (
    workspace_id,
    channel_id,
    incident_id
  )
);

CREATE INDEX IF NOT EXISTS incidents_workspace_channel_updated_idx
  ON incidents (workspace_id, channel_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS incidents_expires_at_idx
  ON incidents (expires_at);

CREATE INDEX IF NOT EXISTS incidents_status_idx
  ON incidents (status);

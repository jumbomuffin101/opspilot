CREATE TABLE IF NOT EXISTS slack_installations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  enterprise_id TEXT,
  app_id TEXT,
  bot_user_id TEXT,
  bot_access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS slack_installations_updated_at_idx
  ON slack_installations (updated_at DESC);

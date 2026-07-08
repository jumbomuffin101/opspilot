CREATE TABLE IF NOT EXISTS github_installations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,
  github_user_login TEXT NOT NULL,
  github_access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS github_installations_updated_at_idx
  ON github_installations (updated_at DESC);

CREATE TABLE IF NOT EXISTS project_configs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,
  workspace_name TEXT,
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  default_service TEXT,
  service_paths_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  deployment_provider TEXT NOT NULL DEFAULT 'mock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_configs_updated_at_idx
  ON project_configs (updated_at DESC);

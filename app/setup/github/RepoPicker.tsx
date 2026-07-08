"use client";

import { useEffect, useState } from "react";

import type {
  DeploymentProvider,
  SafeProjectConfig,
  ServicePathMapping,
} from "@/src/config/projectConfigStore";

interface SafeGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  html_url?: string;
  default_branch?: string;
  updated_at?: string;
}

interface RepoPickerProps {
  teamId: string;
  workspaceName?: string;
  initialConfig?: SafeProjectConfig | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRepo(value: unknown): value is SafeGitHubRepo {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.full_name === "string" &&
    typeof value.owner === "string" &&
    typeof value.private === "boolean"
  );
}

function parseRepos(value: unknown): SafeGitHubRepo[] {
  if (!isRecord(value) || !Array.isArray(value.repos)) return [];
  return value.repos.filter(isRepo);
}

function defaultServicePaths(service: string): ServicePathMapping {
  return { [service]: [`services/${service}`, `apps/${service}`] };
}

function repoNameToService(repoName: string): string {
  return repoName.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "app-service";
}

export function RepoPicker({ teamId, workspaceName, initialConfig }: RepoPickerProps) {
  const [repos, setRepos] = useState<SafeGitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>(initialConfig
    ? `${initialConfig.githubOwner}/${initialConfig.githubRepo}`
    : "");
  const [defaultService, setDefaultService] = useState(
    initialConfig?.defaultService ?? "checkout-api",
  );
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [message, setMessage] = useState("Loading repositories from GitHub...");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRepos(): Promise<void> {
      try {
        const response = await fetch(`/api/github/repos?team_id=${encodeURIComponent(teamId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const error = isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "GitHub repositories could not be loaded";
          throw new Error(error);
        }

        const parsedRepos = parseRepos(payload);
        setRepos(parsedRepos);
        const firstRepo = parsedRepos[0];
        if (!selectedRepo && firstRepo) {
          setSelectedRepo(firstRepo.full_name);
          setDefaultService(repoNameToService(firstRepo.name));
        }
        setStatus("idle");
        setMessage(parsedRepos.length > 0
          ? "Choose the repository OpsPilot should use for incident evidence."
          : "No repositories were returned for this GitHub account.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "GitHub repositories could not be loaded");
      }
    }

    void loadRepos();
    return () => controller.abort();
  }, [selectedRepo, teamId]);

  async function saveSelectedRepo(): Promise<void> {
    const repo = repos.find((candidate) => candidate.full_name === selectedRepo);
    if (!repo) {
      setStatus("error");
      setMessage("Select a repository before continuing.");
      return;
    }

    setStatus("saving");
    setMessage("Saving repository selection...");

    try {
      const response = await fetch("/api/setup/project", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          workspace_name: workspaceName,
          github_owner: repo.owner,
          github_repo: repo.name,
          default_service: defaultService,
          service_paths_json: initialConfig?.servicePaths ?? defaultServicePaths(defaultService),
          deployment_provider: initialConfig?.deploymentProvider ?? "mock" satisfies DeploymentProvider,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Repository selection could not be saved");

      window.location.assign(`/setup/success?team_id=${encodeURIComponent(teamId)}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Repository selection could not be saved");
    }
  }

  const selected = repos.find((repo) => repo.full_name === selectedRepo);

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100/85">
        OpsPilot will use the selected repository for recent commits, changed files, and
        service-specific code paths during incident investigations.
      </div>

      <label className="block text-sm font-medium text-slate-200">
        Repository
        <select
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/15"
          disabled={status === "loading" || repos.length === 0}
          value={selectedRepo}
          onChange={(event) => {
            const fullName = event.target.value;
            setSelectedRepo(fullName);
            const repo = repos.find((candidate) => candidate.full_name === fullName);
            if (repo && !initialConfig?.defaultService) {
              setDefaultService(repoNameToService(repo.name));
            }
          }}
        >
          {repos.map((repo) => (
            <option key={repo.id} value={repo.full_name} className="bg-slate-950 text-white">
              {repo.full_name}
              {repo.private ? " · private" : " · public"}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-200">
        Default service name
        <input
          required
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/15"
          value={defaultService}
          onChange={(event) => setDefaultService(event.target.value)}
        />
      </label>

      {selected ? (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">Visibility</p>
            <p className="mt-1 text-sm text-slate-200">{selected.private ? "Private" : "Public"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">Default branch</p>
            <p className="mt-1 font-mono text-sm text-slate-200">
              {selected.default_branch ?? "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">Owner</p>
            <p className="mt-1 font-mono text-sm text-slate-200">{selected.owner}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${status === "error" ? "text-red-300" : "text-slate-500"}`} role="status">
          {message}
        </p>
        <button
          disabled={status === "loading" || status === "saving" || !selectedRepo}
          type="button"
          onClick={() => {
            void saveSelectedRepo();
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "saving" ? "Saving..." : "Use Selected Repository"}
        </button>
      </div>
    </div>
  );
}

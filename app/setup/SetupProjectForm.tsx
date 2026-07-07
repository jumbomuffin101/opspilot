"use client";

import { useState } from "react";

import type {
  DeploymentProvider,
  SafeProjectConfig,
  ServicePathMapping,
} from "@/src/config/projectConfigStore";

const DEPLOYMENT_OPTIONS: { value: DeploymentProvider; label: string }[] = [
  { value: "mock", label: "Mock" },
  { value: "vercel", label: "Vercel" },
  { value: "render", label: "Render" },
  { value: "github_actions", label: "GitHub Actions" },
];

interface SetupProjectFormProps {
  teamId: string;
  workspaceName?: string;
  initialConfig?: SafeProjectConfig | null;
}

function defaultServicePaths(service?: string): ServicePathMapping {
  return service
    ? { [service]: [`services/${service}`, `apps/${service}`] }
    : { "checkout-api": ["services/checkout-api", "apps/checkout"] };
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function SetupProjectForm({
  teamId,
  workspaceName,
  initialConfig,
}: SetupProjectFormProps) {
  const [githubOwner, setGithubOwner] = useState(initialConfig?.githubOwner ?? "");
  const [githubRepo, setGithubRepo] = useState(initialConfig?.githubRepo ?? "");
  const [defaultService, setDefaultService] = useState(
    initialConfig?.defaultService ?? "checkout-api",
  );
  const [servicePaths, setServicePaths] = useState(
    prettyJson(initialConfig?.servicePaths ?? defaultServicePaths("checkout-api")),
  );
  const [deploymentProvider, setDeploymentProvider] = useState<DeploymentProvider>(
    initialConfig?.deploymentProvider ?? "mock",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string>(
    initialConfig ? "Existing project configuration loaded." : "",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("saving");
    setMessage("Saving project configuration...");

    let parsedServicePaths: unknown;
    try {
      parsedServicePaths = JSON.parse(servicePaths);
    } catch {
      setStatus("error");
      setMessage("Service path mapping must be valid JSON.");
      return;
    }

    try {
      const response = await fetch("/api/setup/project", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          workspace_name: workspaceName,
          github_owner: githubOwner,
          github_repo: githubRepo,
          default_service: defaultService,
          service_paths_json: parsedServicePaths,
          deployment_provider: deploymentProvider,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Project setup failed");

      setStatus("saved");
      setMessage("Project configuration saved. You can now use @OpsPilot in Slack.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Project setup failed");
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/15";
  const labelClass = "text-sm font-medium text-slate-200";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <input type="hidden" name="team_id" value={teamId} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          GitHub owner
          <input
            required
            className={inputClass}
            placeholder="acme"
            value={githubOwner}
            onChange={(event) => setGithubOwner(event.target.value)}
          />
        </label>

        <label className={labelClass}>
          GitHub repo
          <input
            required
            className={inputClass}
            placeholder="commerce-platform"
            value={githubRepo}
            onChange={(event) => setGithubRepo(event.target.value)}
          />
        </label>
      </div>

      <label className={labelClass}>
        Default service name
        <input
          className={inputClass}
          placeholder="checkout-api"
          value={defaultService}
          onChange={(event) => setDefaultService(event.target.value)}
        />
      </label>

      <label className={labelClass}>
        Service path mapping JSON
        <textarea
          className={`${inputClass} min-h-40 font-mono leading-6`}
          value={servicePaths}
          onChange={(event) => setServicePaths(event.target.value)}
          spellCheck={false}
        />
      </label>

      <label className={labelClass}>
        Deployment provider
        <select
          className={inputClass}
          value={deploymentProvider}
          onChange={(event) => setDeploymentProvider(event.target.value as DeploymentProvider)}
        >
          {DEPLOYMENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-950 text-white">
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${
            status === "error"
              ? "text-red-300"
              : status === "saved"
                ? "text-emerald-300"
                : "text-slate-500"
          }`}
          role="status"
        >
          {message || "No GitHub token is stored here; repository access still uses server env configuration."}
        </p>
        <button
          disabled={status === "saving"}
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "saving" ? "Saving..." : "Save Project"}
        </button>
      </div>
    </form>
  );
}

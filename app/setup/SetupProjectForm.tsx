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
  githubConnected: boolean;
}

function defaultServicePaths(service: string): ServicePathMapping {
  return { [service]: [`services/${service}`, `apps/${service}`] };
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function SetupProjectForm({
  teamId,
  workspaceName,
  initialConfig,
  githubConnected,
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
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
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

      window.location.assign(`/setup/success?team_id=${encodeURIComponent(teamId)}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Project setup failed");
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/15";
  const labelClass = "text-sm font-medium text-slate-200";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <input type="hidden" name="team_id" value={teamId} />

      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100/85">
        OpsPilot uses the connected GitHub repository to inspect recent commits,
        changed files, and service-specific paths during incident investigations.
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {githubConnected ? "GitHub connected" : "Connect GitHub"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {githubConnected
                ? "Choose the repository this Slack workspace should use for incident evidence."
                : "Authorize GitHub so OpsPilot can list repositories and read commit metadata for this workspace."}
            </p>
          </div>
          <a
            href={
              githubConnected
                ? `/setup/github?team_id=${encodeURIComponent(teamId)}`
                : `/api/github/install?team_id=${encodeURIComponent(teamId)}`
            }
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
          >
            {githubConnected ? "Choose Repository" : "Connect GitHub"}
          </a>
        </div>
        {initialConfig ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 font-mono text-xs text-slate-300">
            Current repo: {initialConfig.githubOwner}/{initialConfig.githubRepo}
          </p>
        ) : null}
      </div>

      <label className={labelClass}>
        Default service name <span className="text-cyan-200">*</span>
        <input
          required
          className={inputClass}
          placeholder="checkout-api"
          value={defaultService}
          onChange={(event) => {
            const nextService = event.target.value;
            setDefaultService(nextService);
            if (!initialConfig && nextService.trim()) {
              setServicePaths(prettyJson(defaultServicePaths(nextService.trim())));
            }
          }}
        />
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          This is the service OpsPilot should assume when an incident report is ambiguous.
        </span>
      </label>

      <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          Advanced/manual setup
        </summary>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              GitHub owner <span className="text-cyan-200">*</span>
              <input
                className={inputClass}
                placeholder="acme"
                value={githubOwner}
                onChange={(event) => setGithubOwner(event.target.value)}
              />
            </label>

            <label className={labelClass}>
              GitHub repo <span className="text-cyan-200">*</span>
              <input
                className={inputClass}
                placeholder="commerce-platform"
                value={githubRepo}
                onChange={(event) => setGithubRepo(event.target.value)}
              />
            </label>
          </div>

          <label className={labelClass}>
            Service path mapping JSON
            <textarea
              className={`${inputClass} min-h-40 font-mono leading-6`}
              value={servicePaths}
              onChange={(event) => setServicePaths(event.target.value)}
              spellCheck={false}
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              Map service names to repository paths. Example:{" "}
              <span className="font-mono text-slate-400">
                {JSON.stringify({ "checkout-api": ["services/checkout-api"] })}
              </span>
            </span>
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
        </div>
      </details>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.55)]" />
          <div>
            <p className="text-sm font-semibold text-slate-200">
              GitHub access is workspace-specific when connected
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              When GitHub is connected, OpsPilot uses this workspace&apos;s stored GitHub
              OAuth token. Manual fallback can still use the server-side GitHub token
              configured by the deployment.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${status === "error" ? "text-red-300" : "text-slate-500"}`}
          role="status"
        >
          {message || "Save this project context to finish onboarding."}
        </p>
        <button
          disabled={status === "saving"}
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "saving" ? "Saving..." : "Finish Setup"}
        </button>
      </div>
    </form>
  );
}

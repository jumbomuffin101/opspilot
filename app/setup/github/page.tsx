import Link from "next/link";

import { RepoPicker } from "@/app/setup/github/RepoPicker";
import { BrandMark } from "@/components/home/BrandMark";
import { getSafeProjectConfigByTeam } from "@/src/config/projectConfigStore";
import { hasGitHubInstallation } from "@/src/github/githubInstallationStore";
import { getInstallationByTeam } from "@/src/slack/installationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GitHubSetupPageProps {
  searchParams: Promise<{
    team_id?: string;
  }>;
}

export default async function GitHubSetupPage({ searchParams }: GitHubSetupPageProps) {
  const params = await searchParams;
  const teamId = params.team_id?.trim();
  const [slackInstallation, projectConfig, githubConnected] = teamId
    ? await Promise.all([
        getInstallationByTeam(teamId),
        getSafeProjectConfigByTeam(teamId),
        hasGitHubInstallation(teamId),
      ])
    : [null, null, false];
  const workspaceName = slackInstallation?.teamName ?? projectConfig?.workspaceName;

  return (
    <main className="page-shell min-h-screen px-5 py-10 text-white sm:px-6 lg:px-8">
      <div className="grid-overlay pointer-events-none absolute inset-x-0 top-0 h-[620px]" />
      <section className="relative mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold">
          <BrandMark />
          OpsPilot
        </Link>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.035] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-white/[.035] px-6 py-7 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[.22em] text-cyan-200">
              GitHub repository
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
              Choose a repository
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Select the repository OpsPilot should inspect for commits, changed files,
              and service-specific evidence.
            </p>
          </div>

          <div className="px-6 py-7 sm:px-8">
            {teamId && githubConnected ? (
              <>
                <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                      Workspace
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                      {workspaceName ?? "Slack workspace"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                      GitHub
                    </p>
                    <p className="mt-1 text-sm text-emerald-300">Connected</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                      Current repo
                    </p>
                    <p className="mt-1 font-mono text-sm text-slate-200">
                      {projectConfig
                        ? `${projectConfig.githubOwner}/${projectConfig.githubRepo}`
                        : "Not selected"}
                    </p>
                  </div>
                </div>

                <RepoPicker
                  teamId={teamId}
                  workspaceName={workspaceName}
                  initialConfig={projectConfig}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <h2 className="text-lg font-semibold text-amber-100">GitHub is not connected</h2>
                <p className="mt-2 text-sm leading-6 text-amber-100/75">
                  Connect GitHub from setup before choosing a repository.
                </p>
                {teamId ? (
                  <a
                    href={`/api/github/install?team_id=${encodeURIComponent(teamId)}`}
                    className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950"
                  >
                    Connect GitHub
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

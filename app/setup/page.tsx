import Link from "next/link";

import { BrandMark } from "@/components/home/BrandMark";
import { SetupProjectForm } from "@/app/setup/SetupProjectForm";
import { getSafeProjectConfigByTeam } from "@/src/config/projectConfigStore";
import { getInstallationByTeam } from "@/src/slack/installationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SetupPageProps {
  searchParams: Promise<{
    team_id?: string;
  }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const teamId = params.team_id?.trim();
  const [installation, projectConfig] = teamId
    ? await Promise.all([
        getInstallationByTeam(teamId),
        getSafeProjectConfigByTeam(teamId),
      ])
    : [null, null];
  const workspaceName = installation?.teamName ?? projectConfig?.workspaceName;

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
              Workspace setup
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
              Connect OpsPilot to your project context.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Add the GitHub repository and service mapping OpsPilot should use when
              engineers mention it inside Slack.
            </p>
          </div>

          <div className="px-6 py-7 sm:px-8">
            {teamId ? (
              <>
                <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                      Slack workspace
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                      {workspaceName ?? "Workspace installed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                      Team ID
                    </p>
                    <p className="mt-1 font-mono text-sm text-slate-200">{teamId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                      Install status
                    </p>
                    <p className="mt-1 text-sm text-emerald-300">
                      {installation ? "Slack connected" : "Manual setup"}
                    </p>
                  </div>
                </div>

                <SetupProjectForm
                  teamId={teamId}
                  workspaceName={workspaceName}
                  initialConfig={projectConfig}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <h2 className="text-lg font-semibold text-amber-100">Missing Slack team ID</h2>
                <p className="mt-2 text-sm leading-6 text-amber-100/75">
                  Open this page from the Slack OAuth redirect or include a
                  <span className="font-mono"> team_id</span> query parameter.
                </p>
                <a
                  href="/api/slack/install"
                  className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950"
                >
                  Add to Slack
                </a>
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          Add to Slack → connect GitHub repo → use @OpsPilot inside Slack.
        </p>
      </section>
    </main>
  );
}

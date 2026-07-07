import Link from "next/link";

import { BrandMark } from "@/components/home/BrandMark";
import { getSafeProjectConfigByTeam } from "@/src/config/projectConfigStore";
import { getInstallationByTeam } from "@/src/slack/installationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SetupSuccessPageProps {
  searchParams: Promise<{
    team_id?: string;
  }>;
}

const slackExamples = [
  "/opspilot investigate checkout API is failing after latest deploy",
  "@OpsPilot show evidence",
  "@OpsPilot generate postmortem",
] as const;

export default async function SetupSuccessPage({ searchParams }: SetupSuccessPageProps) {
  const params = await searchParams;
  const teamId = params.team_id?.trim();
  const [installation, projectConfig] = teamId
    ? await Promise.all([
        getInstallationByTeam(teamId),
        getSafeProjectConfigByTeam(teamId),
      ])
    : [null, null];

  return (
    <main className="page-shell min-h-screen px-5 py-10 text-white sm:px-6 lg:px-8">
      <div className="grid-overlay pointer-events-none absolute inset-x-0 top-0 h-[620px]" />
      <section className="relative mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold">
          <BrandMark />
          OpsPilot
        </Link>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.035] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-white/[.035] px-6 py-8 text-center sm:px-8">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
              ✓
            </div>
            <p className="mt-5 font-mono text-xs uppercase tracking-[.22em] text-emerald-200">
              Setup complete
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
              OpsPilot is ready
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Your workspace can now use OpsPilot in Slack with the project context below.
            </p>
          </div>

          <div className="space-y-6 px-6 py-7 sm:px-8">
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                  Workspace
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {installation?.teamName ?? projectConfig?.workspaceName ?? "Slack workspace"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                  Connected repo
                </p>
                <p className="mt-1 font-mono text-sm text-slate-200">
                  {projectConfig
                    ? `${projectConfig.githubOwner}/${projectConfig.githubRepo}`
                    : "Not configured"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[.16em] text-slate-600">
                  Default service
                </p>
                <p className="mt-1 font-mono text-sm text-slate-200">
                  {projectConfig?.defaultService ?? "Not configured"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <h2 className="text-lg font-semibold text-white">Use OpsPilot in Slack</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Open Slack and try one of these commands in an incident or engineering channel:
              </p>
              <div className="mt-4 space-y-2">
                {slackExamples.map((example) => (
                  <code
                    key={example}
                    className="block rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cyan-100"
                  >
                    {example}
                  </code>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100/85">
                Direct Slack workspace links are not available from the current OAuth
                payload. Open Slack manually, choose your workspace, and mention OpsPilot
                in the channel where the incident starts.
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-300">Connect GitHub OAuth</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Coming soon: allow each workspace to securely authorize its own
                    repositories.
                  </p>
                </div>
                <button
                  disabled
                  type="button"
                  className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-500"
                >
                  Coming soon
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {teamId ? (
                <Link
                  href={`/setup?team_id=${encodeURIComponent(teamId)}`}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.045] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[.08]"
                >
                  Edit project setup
                </Link>
              ) : null}
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Back to homepage
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

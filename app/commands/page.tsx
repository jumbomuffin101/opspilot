import Link from "next/link";
import type { ReactNode } from "react";

import { AddToSlackButton } from "@/components/home/AddToSlackButton";
import { BrandMark } from "@/components/home/BrandMark";
import {
  incidentResponseCommands,
  repositoryIntelligenceCommands,
  usageModeCommands,
} from "@/src/lib/commandGuide";

const startSteps = [
  {
    title: "Add to Slack",
    description: "Install OpsPilot into the workspace where incidents and deploy reviews happen.",
  },
  {
    title: "Connect GitHub",
    description: "Authorize GitHub and select the repository OpsPilot should inspect.",
  },
  {
    title: "Open the Slack agent",
    description: "Use Slack's agent experience for suggested prompts, live status, and contextual thread titles.",
  },
] as const;

const incidentCommands = [
  "/opspilot investigate checkout API is failing",
  "@OpsPilot investigate checkout failures",
  "@OpsPilot show evidence",
  "@OpsPilot show timeline",
  "@OpsPilot who owns checkout-api",
  "@OpsPilot generate postmortem",
  "@OpsPilot mark resolved",
] as const;

const repositoryCommands = [
  "/opspilot audit repo",
  "@OpsPilot check my repo for issues",
  "@OpsPilot summarize this repo",
  "@OpsPilot explain the highest risk change",
  "@OpsPilot what should I test?",
  "@OpsPilot write release notes",
  "@OpsPilot create a rollback runbook",
  "@OpsPilot who should review this?",
] as const;

function CommandCard({ command }: { command: string }) {
  return (
    <code className="block rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cyan-100 shadow-inner shadow-black/30">
      {command}
    </code>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 shadow-2xl shadow-black/20 sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[.22em] text-cyan-200">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-.035em] text-white sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function CommandsPage() {
  return (
    <main className="page-shell min-h-screen px-5 py-8 text-white sm:px-6 lg:px-8">
      <div className="grid-overlay pointer-events-none absolute inset-x-0 top-0 h-[640px]" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold">
            <BrandMark />
            OpsPilot
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-400 transition hover:text-white">
              Home
            </Link>
            <AddToSlackButton compact />
          </div>
        </header>

        <section className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[.24em] text-violet-200">
              Slack command guide
            </p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-.06em] text-white sm:text-6xl">
              OpsPilot Command Guide
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              Install OpsPilot in Slack, connect your GitHub repo, then use these
              commands from Slack&apos;s agent surface, channels, or threads.
            </p>
          </div>
        </section>

        <div className="grid gap-6 pb-16">
          <Section eyebrow="A" title="Start Here">
            <div className="grid gap-4 md:grid-cols-3">
              {startSteps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-white text-sm font-bold text-slate-950">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section eyebrow="B" title="Ways to Use OpsPilot">
            <div className="grid gap-3 md:grid-cols-3">
              {usageModeCommands.map((command) => (
                <div key={command.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-cyan-100">{command.label}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{command.description}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section eyebrow="C" title="Incident Response Commands">
            <div className="grid gap-3 md:grid-cols-2">
              {incidentCommands.map((command) => (
                <CommandCard key={command} command={command} />
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Shared help menu source: {incidentResponseCommands.length} incident examples are
              also available inside Slack.
            </p>
          </Section>

          <Section eyebrow="D" title="Repository Intelligence Commands">
            <div className="grid gap-3 md:grid-cols-2">
              {repositoryCommands.map((command) => (
                <CommandCard key={command} command={command} />
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Shared help menu source: {repositoryIntelligenceCommands.length} repository
              examples are also available inside Slack.
            </p>
          </Section>

          <Section eyebrow="E" title="Follow-up Questions">
            <p className="max-w-3xl text-sm leading-7 text-slate-400">
              OpsPilot remembers the latest incident or repository audit in the current
              Slack channel/thread. Ask follow-up questions in that context instead of
              repeating the original command.
            </p>
          </Section>

          <Section eyebrow="F" title="Best Practices">
            <ul className="grid gap-3 text-sm leading-6 text-slate-400 md:grid-cols-2">
              <li className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Invite OpsPilot to incident channels before high-pressure moments.
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Run repo audit before deployment to review risky recent changes.
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Ask follow-up questions in Slack threads so context stays precise.
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Use Create Incident Channel during outages to coordinate responders.
              </li>
            </ul>
          </Section>

          <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-8 text-center">
            <h2 className="text-3xl font-semibold tracking-[-.04em] text-white">
              Ready to use OpsPilot in Slack?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-cyan-100/75">
              Add OpsPilot, connect GitHub, and start with an incident investigation or
              repository audit.
            </p>
            <div className="mt-6 flex justify-center">
              <AddToSlackButton />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

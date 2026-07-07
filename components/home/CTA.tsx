import { AddToSlackButton } from "@/components/home/AddToSlackButton";
import { GITHUB_URL } from "@/components/home/links";

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-6 lg:px-8 lg:pb-32">
      <div className="cta-panel relative overflow-hidden rounded-[2rem] border border-violet-300/20 px-6 py-16 text-center sm:px-10 sm:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[.22em] text-violet-200">
            Bring the agent to the incident
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-.045em] text-white sm:text-5xl lg:text-6xl">
            Ready to modernize incident response?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Give engineering teams evidence, coordination, and follow-through from the
            Slack workspace they already share.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <AddToSlackButton />
            <a
              href="/setup"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-cyan-300/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 sm:text-base"
            >
              Configure Project
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.06] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 sm:text-base"
            >
              View GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

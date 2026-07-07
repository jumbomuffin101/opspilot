import { AddToSlackButton } from "@/components/home/AddToSlackButton";

export function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pt-32"
    >
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-3 py-1.5 text-xs font-medium text-slate-300">
        <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
        Built for the Slack Agent Builder Challenge
      </div>
      <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-semibold leading-[.95] tracking-[-.06em] text-white sm:text-7xl lg:text-[6.4rem]">
        AI Incident Response.
        <br />
        <span className="bg-gradient-to-r from-violet-300 via-white to-cyan-200 bg-clip-text text-transparent">
          Native to Slack.
        </span>
      </h1>
      <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-400 sm:text-xl">
        Investigate outages, coordinate responders, analyze deployments, and generate
        postmortems—all without leaving Slack.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <AddToSlackButton />
        <a
          href="#demo"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.045] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.08] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 sm:text-base"
        >
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full border border-white/20 text-[9px]"
          >
            ▶
          </span>
          Watch Demo
        </a>
        <a
          href="/setup"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-cyan-300/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 sm:text-base"
        >
          Configure Project
        </a>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Add to Slack → connect GitHub repo → use{" "}
        <span className="font-mono text-slate-300">@OpsPilot</span> inside Slack.
      </p>
    </section>
  );
}

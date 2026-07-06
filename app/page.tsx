const features = [
  {
    index: "01",
    title: "Evidence, assembled",
    copy: "Correlate Slack context, deployments, commits, ownership, and prior incidents in one response.",
  },
  {
    index: "02",
    title: "Response, coordinated",
    copy: "Turn analysis into an incident room, an owner-ready checklist, and a clear update cadence.",
  },
  {
    index: "03",
    title: "Reliability, built in",
    copy: "Use structured AI reasoning in production and deterministic fallbacks when the demo must never fail.",
  },
];

const workflow = [
  ["01", "Report", "Run /opspilot investigate from the channel where the incident starts."],
  ["02", "Correlate", "OpsPilot gathers operational signals through independent evidence tools."],
  ["03", "Decide", "Responders receive likely causes, practical actions, owners, and confidence."],
  ["04", "Coordinate", "Open an incident room, draft the postmortem, and resolve from Slack."],
] as const;

const architecture = ["Slack", "Agent", "Evidence tools", "AI + fallback", "Incident workflow"];
const technologies = [
  "Slack Platform",
  "Next.js 16",
  "TypeScript",
  "Tailwind CSS",
  "OpenAI",
  "GitHub REST API",
  "Vercel",
];
const judgingCriteria = [
  {
    title: "Slack-native experience",
    copy: "Commands, Block Kit results, and interactive actions keep the operational workflow where responders already work.",
  },
  {
    title: "Technical execution",
    copy: "Strict TypeScript, signed request verification, modular tools, structured output validation, and graceful degradation.",
  },
  {
    title: "Real operational value",
    copy: "Compress the first critical minutes of incident response into a shared, evidence-backed operating picture.",
  },
];

function Mark() {
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(255,255,255,.2)]">
      O
    </span>
  );
}

function Eyebrow({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="font-mono text-xs uppercase tracking-[.24em] text-violet-300">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="page-shell min-h-screen overflow-hidden">
      <div className="grid-overlay pointer-events-none absolute inset-x-0 top-0 h-[760px]" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="#top" className="flex items-center gap-3 text-sm font-semibold tracking-tight">
          <Mark />
          OpsPilot
        </a>
        <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <a className="transition hover:text-white" href="#workflow">Demo flow</a>
          <a className="transition hover:text-white" href="#architecture">Architecture</a>
          <a className="transition hover:text-white" href="#judging">Why OpsPilot</a>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100">
          Slack-first
        </span>
      </nav>

      <section
        id="top"
        className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-28 pt-20 lg:grid-cols-[1.12fr_.88fr] lg:px-8 lg:pb-36 lg:pt-28"
      >
        <div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-medium text-violet-100">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
            Slack Agent Builder Challenge
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-7xl lg:text-[5.5rem]">
            From incident signal
            <br />
            <span className="bg-gradient-to-r from-slate-200 via-violet-300 to-emerald-200 bg-clip-text text-transparent">
              to coordinated action.
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
            OpsPilot is the AI incident commander that investigates, explains, and coordinates
            response without pulling your team out of Slack.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#workflow"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              See the demo flow
            </a>
            <span className="text-sm text-slate-500">Slack is the product. This page is the briefing.</span>
          </div>
        </div>

        <div className="glass-card relative rounded-3xl p-3">
          <div className="rounded-2xl border border-white/10 bg-[#090c12] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <Mark />
                <div>
                  <p className="text-sm font-semibold">OpsPilot</p>
                  <p className="text-xs text-slate-500">APP · just now</p>
                </div>
              </div>
              <span className="rounded-md bg-red-400/10 px-2 py-1 font-mono text-xs text-red-300">
                SEV-1 · 91%
              </span>
            </div>
            <div className="space-y-5 pt-5">
              <div>
                <p className="font-semibold text-slate-100">Checkout API returning HTTP 500</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Multiple signals point to a database pool regression introduced by the 2.19.0 rollout.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
                  <p className="mt-2 text-sm text-amber-200">Investigating</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Next update</p>
                  <p className="mt-2 text-sm text-slate-200">In 15 minutes</p>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                  Recommended containment
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Pause the rollout, inspect pool saturation, and prepare rollback to the last known-good release.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {['Open incident room', 'Draft postmortem', 'Resolve incident'].map((action) => (
                  <span key={action} className="rounded-md border border-white/10 px-3 py-2 text-slate-400">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[.018]">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <Eyebrow>Incident operations, accelerated</Eyebrow>
          <div className="mt-5 grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <h2 className="text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
              A shared operating picture in minutes.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-slate-400">
              OpsPilot reduces coordination overhead while keeping humans accountable for every consequential decision.
            </p>
          </div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.index} className="bg-[#080b10] p-8">
                <span className="font-mono text-xs text-slate-600">{feature.index}</span>
                <h3 className="mt-14 text-xl font-medium">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="max-w-2xl">
          <Eyebrow>Three-minute demo</Eyebrow>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
            One command. A complete response loop.
          </h2>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {workflow.map(([number, title, copy]) => (
            <article key={number} className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
              <span className="font-mono text-xs text-violet-300">{number}</span>
              <h3 className="mt-8 text-lg font-medium">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-violet-300/20 bg-violet-300/[.06] p-5 font-mono text-sm text-violet-100">
          /opspilot investigate checkout API returning 500 errors after latest deploy
        </div>
      </section>

      <section id="architecture" className="border-y border-white/10 bg-white/[.018]">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 lg:grid-cols-[.65fr_1.35fr] lg:items-center lg:px-8 lg:py-32">
          <div>
            <Eyebrow>Architecture</Eyebrow>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.04em]">Modular by design. Reliable by default.</h2>
            <p className="mt-6 max-w-md leading-7 text-slate-400">
              Independent tools gather evidence. Structured AI reasoning synthesizes it. Deterministic mode preserves the exact demo path when external systems are unavailable.
            </p>
          </div>
          <div className="glass-card rounded-3xl p-5 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-5">
              {architecture.map((item, index) => (
                <div key={item} className="relative rounded-xl border border-white/10 bg-black/20 p-5 text-center">
                  <span className="mb-8 block font-mono text-[10px] text-slate-600">0{index + 1}</span>
                  <p className="text-sm font-medium text-slate-200">{item}</p>
                  {index < architecture.length - 1 && (
                    <span className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#10131b] text-[10px] text-slate-500 sm:grid">
                      ›
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="judging" className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <Eyebrow>Built to be judged</Eyebrow>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.04em]">A focused agent with measurable operational impact.</h2>
          </div>
          <div className="space-y-3">
            {judgingCriteria.map((criterion) => (
              <article key={criterion.title} className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
                <h3 className="font-medium text-slate-100">{criterion.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{criterion.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-28 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-400/[.08] to-emerald-300/[.03] p-8 sm:p-12">
          <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
            <div>
              <Eyebrow>Technology</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Built for a production path, hardened for the demo.</h2>
            </div>
            <div className="flex max-w-2xl flex-wrap gap-2">
              {technologies.map((technology) => (
                <span key={technology} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300">
                  {technology}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3 text-slate-300"><Mark />OpsPilot</div>
          <p>AI incident command, where the response already happens · Slack Agent Builder Challenge 2026</p>
        </div>
      </footer>
    </main>
  );
}

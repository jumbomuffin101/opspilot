const features = [
  { index: "01", title: "Context, assembled", copy: "Unify Slack conversations, deploy history, and operational evidence into one incident view." },
  { index: "02", title: "Response, coordinated", copy: "Keep owners, decisions, recommended actions, and the evolving timeline visible to responders." },
  { index: "03", title: "Slack-native by design", copy: "Meet teams where incidents already unfold. The web presence explains the product; Slack runs it." },
];

const architecture = ["Slack", "OpsPilot Agent", "Incident Tools", "GitHub + OpenAI"];
const technologies = ["Slack Platform", "Next.js", "TypeScript", "Tailwind CSS", "OpenAI", "GitHub", "Vercel"];

function Mark() {
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(255,255,255,.2)]">O</span>
  );
}

export default function Home() {
  return (
    <main className="page-shell min-h-screen overflow-hidden">
      <div className="grid-overlay pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="#top" className="flex items-center gap-3 text-sm font-semibold tracking-tight"><Mark />OpsPilot</a>
        <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <a className="transition hover:text-white" href="#features">Capabilities</a>
          <a className="transition hover:text-white" href="#architecture">Architecture</a>
          <a className="transition hover:text-white" href="#technology">Technology</a>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">Built for Slack</span>
      </nav>

      <section id="top" className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-28 pt-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:pb-36 lg:pt-28">
        <div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-medium text-violet-100">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
            Slack Agent Builder Challenge
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-7xl lg:text-[5.6rem]">
            Command incidents.<br /><span className="bg-gradient-to-r from-slate-300 via-violet-300 to-emerald-200 bg-clip-text text-transparent">Right from Slack.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
            OpsPilot is an AI incident commander that connects the signal, the team, and the next best action—without pulling responders out of the conversation.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#architecture" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Explore the architecture</a>
            <span className="text-sm text-slate-500">Slack is the primary interface</span>
          </div>
        </div>

        <div className="glass-card relative rounded-3xl p-3">
          <div className="rounded-2xl border border-white/10 bg-[#090c12] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3"><Mark /><div><p className="text-sm font-semibold">OpsPilot</p><p className="text-xs text-slate-500">APP · just now</p></div></div>
              <span className="rounded-md bg-red-400/10 px-2 py-1 font-mono text-xs text-red-300">SEV-1</span>
            </div>
            <div className="space-y-5 pt-5">
              <div><p className="font-semibold text-slate-100">Checkout API returning HTTP 500</p><p className="mt-2 text-sm leading-6 text-slate-400">Error rate reached 37.4% after production deployment <span className="font-mono text-violet-300">8b6e5a9</span>.</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Status</p><p className="mt-2 text-sm text-amber-200">Monitoring rollback</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Commander</p><p className="mt-2 text-sm text-slate-200">Maya Chen</p></div></div>
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Recommended next action</p><p className="mt-2 text-sm leading-6 text-slate-300">Run a synthetic checkout and compare connection pool configuration between releases.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-white/10 bg-white/[.018]">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[.24em] text-violet-300">Incident operations, accelerated</p>
          <div className="mt-5 grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><h2 className="text-4xl font-semibold tracking-[-.04em] sm:text-5xl">A shared operating picture for every responder.</h2><p className="max-w-xl text-lg leading-8 text-slate-400">OpsPilot is designed to reduce coordination overhead while keeping human operators in control of consequential decisions.</p></div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {features.map((feature) => <article key={feature.index} className="bg-[#080b10] p-8"><span className="font-mono text-xs text-slate-600">{feature.index}</span><h3 className="mt-16 text-xl font-medium">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{feature.copy}</p></article>)}
          </div>
        </div>
      </section>

      <section id="architecture" className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
          <div><p className="font-mono text-xs uppercase tracking-[.24em] text-emerald-300">Architecture</p><h2 className="mt-5 text-4xl font-semibold tracking-[-.04em]">One workflow.<br />Connected systems.</h2><p className="mt-6 max-w-md leading-7 text-slate-400">A modular TypeScript core separates Slack interaction, incident orchestration, service adapters, and operational tools for clean evolution.</p></div>
          <div className="glass-card rounded-3xl p-5 sm:p-8"><div className="grid gap-3 sm:grid-cols-4">{architecture.map((item, index) => <div key={item} className="relative rounded-xl border border-white/10 bg-black/20 p-5 text-center"><span className="mb-8 block font-mono text-[10px] text-slate-600">0{index + 1}</span><p className="text-sm font-medium text-slate-200">{item}</p>{index < architecture.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#10131b] text-[10px] text-slate-500 sm:grid">›</span>}</div>)}</div></div>
        </div>
      </section>

      <section id="technology" className="mx-auto max-w-7xl px-6 pb-28 lg:px-8"><div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-400/[.08] to-emerald-300/[.03] p-8 sm:p-12"><div className="flex flex-col justify-between gap-10 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[.24em] text-violet-300">Technology</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">Built on a production-ready foundation.</h2></div><div className="flex max-w-2xl flex-wrap gap-2">{technologies.map((technology) => <span key={technology} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300">{technology}</span>)}</div></div></div></section>

      <footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><div className="flex items-center gap-3 text-slate-300"><Mark />OpsPilot</div><p>Built for the Slack Agent Builder Challenge · 2026</p></div></footer>
    </main>
  );
}

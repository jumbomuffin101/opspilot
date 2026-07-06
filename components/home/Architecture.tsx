import { SectionHeading } from "@/components/home/SectionHeading";

const evidenceSources = ["GitHub", "Slack Search", "Deployments"] as const;

export function Architecture() {
  return (
    <section id="architecture" className="scroll-mt-20 border-y border-white/[.07] bg-white/[.018]">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-6 lg:grid-cols-[.72fr_1.28fr] lg:items-center lg:px-8 lg:py-32">
        <SectionHeading
          eyebrow="Live architecture"
          title="Evidence flows in. Coordinated action flows out."
          description="OpsPilot keeps collection, reasoning, and response modular—so production integrations can evolve without changing how engineers work in Slack."
        />

        <div className="architecture-panel relative overflow-hidden rounded-3xl border border-white/10 bg-[#090c12] p-5 sm:p-8">
          <div className="architecture-grid absolute inset-0 opacity-40" />
          <div className="relative mx-auto flex max-w-xl flex-col items-center">
            <div className="architecture-node w-full max-w-[220px]">
              <span className="size-2 rounded-full bg-[#36C5F0]" />
              <span>Slack</span>
            </div>

            <div className="architecture-connector"><span className="architecture-signal" /></div>

            <div className="architecture-node architecture-node-active w-full max-w-[260px]">
              <span className="grid size-6 place-items-center rounded-md bg-white text-[10px] font-black text-slate-950">O</span>
              <span>OpsPilot</span>
              <span className="ml-auto rounded-full bg-emerald-300/10 px-2 py-1 font-mono text-[9px] text-emerald-200">ACTIVE</span>
            </div>

            <div className="architecture-connector"><span className="architecture-signal architecture-signal-delay" /></div>

            <div className="architecture-node w-full max-w-[280px]">
              <span className="size-2 rounded-full bg-violet-300" />
              <span>Evidence Engine</span>
            </div>

            <div className="architecture-connector"><span className="architecture-signal" /></div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              {evidenceSources.map((source) => (
                <div key={source} className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-center font-mono text-[11px] text-slate-300">
                  {source}
                </div>
              ))}
            </div>

            <div className="architecture-connector"><span className="architecture-signal architecture-signal-delay" /></div>

            <div className="architecture-node w-full max-w-[250px]">
              <span className="size-2 rounded-full bg-amber-300" />
              <span>AI Reasoning</span>
            </div>

            <div className="architecture-connector"><span className="architecture-signal" /></div>

            <div className="architecture-node w-full max-w-[280px] border-emerald-300/20 bg-emerald-300/[.06]">
              <span className="size-2 rounded-full bg-emerald-300" />
              <span>Incident Response</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

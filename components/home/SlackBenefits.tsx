import { SectionHeading } from "@/components/home/SectionHeading";

const benefits = [
  ["No context switch", "Responders investigate and act from the channel where the incident was first reported."],
  ["Shared by default", "Evidence, decisions, owners, and updates remain visible to every engineer in the response."],
  ["Conversation becomes context", "Natural follow-up questions reuse the active incident instead of restarting the investigation."],
] as const;

export function SlackBenefits() {
  return (
    <section id="why-slack" className="scroll-mt-20">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:py-32">
        <div>
          <SectionHeading
            eyebrow="Why Slack?"
            title="Incident response already happens in conversation."
            description="Engineers already work inside Slack. OpsPilot keeps investigation and coordination where those conversations happen instead of forcing teams into another dashboard."
          />
          <p className="mt-8 border-l-2 border-violet-300/50 pl-5 text-lg leading-8 text-slate-300">
            The best incident tool is the one responders do not have to remember to open.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#301334]/60 to-[#0c0f15] p-5 sm:p-8">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-sm font-bold">#</span>
            <div>
              <p className="text-sm font-semibold text-white"># incident-response</p>
              <p className="text-xs text-slate-500">Where people, evidence, and action converge</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {benefits.map(([title, copy], index) => (
              <article key={title} className="flex gap-4 rounded-2xl border border-white/[.07] bg-black/20 p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-300/10 font-mono text-[10px] text-violet-200">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

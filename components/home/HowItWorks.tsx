import { SectionHeading } from "@/components/home/SectionHeading";

const steps = [
  {
    number: "01",
    title: "Install OpsPilot into Slack",
    copy: "Connect the agent to the workspace where engineering incidents already unfold.",
    detail: "One workspace installation",
  },
  {
    number: "02",
    title: "Mention OpsPilot",
    copy: "Ask in natural language from the channel where the first signal appears.",
    detail: "@OpsPilot investigate checkout failures",
  },
  {
    number: "03",
    title: "OpsPilot gathers evidence",
    copy: "Independent tools correlate operational context before reasoning begins.",
    detail: "GitHub · Slack · Deployments · Incident history",
  },
  {
    number: "04",
    title: "Coordinate the response",
    copy: "Create incident channels, assign owners, generate postmortems, and mark incidents resolved.",
    detail: "One shared response loop",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-white/[.07] bg-white/[.018]">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
        <SectionHeading
          eyebrow="How it works"
          title="Install once. Respond together."
          description="OpsPilot turns the Slack conversation into the incident operating system—without asking engineers to adopt another dashboard."
        />

        <ol className="relative mt-14 grid gap-4 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.number} className="relative">
              <article className="h-full rounded-2xl border border-white/10 bg-[#0c0f15] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/20 hover:bg-white/[.035]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-violet-300">{step.number}</span>
                  <span className="size-2 rounded-full bg-violet-300/70 shadow-[0_0_14px_rgba(196,181,253,.5)]" />
                </div>
                <h3 className="mt-10 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{step.copy}</p>
                <p className="mt-6 border-t border-white/[.07] pt-4 font-mono text-[11px] leading-5 text-slate-500">
                  {step.detail}
                </p>
              </article>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="mx-auto block py-2 text-center text-lg text-slate-700 lg:absolute lg:-right-4 lg:top-1/2 lg:z-10 lg:-translate-y-1/2 lg:py-0"
                >
                  ↓
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import { SectionHeading } from "@/components/home/SectionHeading";

const steps = [
  {
    number: "01",
    title: "Add OpsPilot to Slack",
    copy: "Install the Slack-native incident commander into the workspace where response work already happens.",
    detail: "One Add to Slack flow",
  },
  {
    number: "02",
    title: "Connect your project",
    copy: "Choose the GitHub owner, repo, default service, and service paths OpsPilot should use for investigations.",
    detail: "GitHub owner · repo · service map",
  },
  {
    number: "03",
    title: "Use OpsPilot inside Slack",
    copy: "Start from Slack's agent surface, a mention, or a slash command in the channel where the first signal appears.",
    detail: "Slack agent · @OpsPilot · /opspilot",
  },
  {
    number: "04",
    title: "Coordinate response",
    copy: "Create incident channels, generate postmortems, and resolve incidents from interactive Slack workflows.",
    detail: "Channels · postmortems · resolution",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-white/[.07] bg-white/[.018]">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
        <SectionHeading
          eyebrow="How it works"
          title="One install flow. Slack stays the interface."
          description="OpsPilot installs into Slack, collects your project context during setup, and then works where engineers already coordinate incidents."
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
                <p className="mt-6 whitespace-pre-line border-t border-white/[.07] pt-4 font-mono text-[11px] leading-5 text-slate-500">
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

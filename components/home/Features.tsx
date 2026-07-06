import { SectionHeading } from "@/components/home/SectionHeading";

const features = [
  {
    marker: "AI",
    title: "AI Investigation",
    copy: "Transforms fragmented operational signals into a structured incident assessment with confidence and practical next actions.",
  },
  {
    marker: "@",
    title: "Slack Native",
    copy: "Responders mention OpsPilot, ask follow-up questions, and execute actions directly inside threaded Slack conversations.",
  },
  {
    marker: "GH",
    title: "GitHub Intelligence",
    copy: "Ranks recent commits by service and issue relevance, then surfaces risky code paths alongside the incident.",
  },
  {
    marker: "CD",
    title: "Deployment Correlation",
    copy: "Connects release timing, versions, commit signals, and service impact to expose likely rollout regressions.",
  },
  {
    marker: "TL",
    title: "Incident Timeline",
    copy: "Builds a concise sequence of deployments, customer reports, alerts, decisions, and response milestones.",
  },
  {
    marker: "PM",
    title: "Postmortem Generation",
    copy: "Creates a review-ready draft with summary, impact, root cause, resolution, timeline, and follow-up work.",
  },
  {
    marker: "EV",
    title: "Evidence-Based Reasoning",
    copy: "Separates observations from hypotheses and lowers confidence when the available evidence is incomplete.",
  },
  {
    marker: "→",
    title: "Interactive Incident Workflows",
    copy: "Open an incident room, coordinate owners, draft the postmortem, and resolve the incident from Block Kit actions.",
  },
] as const;

export function Features() {
  return (
    <section id="features" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
        <SectionHeading
          centered
          eyebrow="Built for incident response"
          title="An engineering teammate, not another alert bot."
          description="Every capability is designed to shorten the distance between a weak signal and a coordinated, evidence-backed response."
        />

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-white/[.08] bg-gradient-to-b from-white/[.035] to-transparent p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/20 hover:from-violet-300/[.07]"
            >
              <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-black/20 font-mono text-xs font-semibold text-violet-200 transition group-hover:border-violet-300/30 group-hover:bg-violet-300/10">
                {feature.marker}
              </span>
              <h3 className="mt-8 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{feature.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

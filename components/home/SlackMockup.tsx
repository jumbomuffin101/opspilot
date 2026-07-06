import { BrandMark } from "@/components/home/BrandMark";
import { SectionHeading } from "@/components/home/SectionHeading";
import { SlackCard } from "@/components/home/SlackCard";

const channels = ["engineering", "deployments", "inc-checkout-api"] as const;

export function SlackMockup() {
  return (
    <section id="demo" className="relative mx-auto max-w-7xl scroll-mt-20 px-5 pb-24 sm:px-6 lg:px-8 lg:pb-32">
      <SectionHeading
        centered
        eyebrow="The product lives in Slack"
        title="From first signal to final follow-up."
        description="OpsPilot joins the conversation, assembles evidence, and turns its findings into an incident workflow your team can act on."
      />

      <div className="mockup-glow relative mx-auto mt-14 max-w-6xl">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#10131a] shadow-[0_35px_100px_rgba(0,0,0,.48)]">
          <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-[#181b23] px-4">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] font-medium text-slate-500">Acme Engineering · Slack</span>
          </div>

          <div className="grid min-h-[500px] md:grid-cols-[210px_1fr]">
            <aside className="hidden bg-[#301334] p-4 text-[#d8c4d9] md:block" aria-label="Mock Slack sidebar">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="grid size-8 place-items-center rounded-lg bg-white/10 text-xs font-bold text-white">AE</span>
                <div>
                  <p className="text-sm font-semibold text-white">Acme Engineering</p>
                  <p className="text-[10px] text-[#bfa8c1]">24 responders online</p>
                </div>
              </div>
              <p className="mt-5 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#a98eab]">Channels</p>
              <div className="mt-2 space-y-1">
                {channels.map((channel) => (
                  <div
                    key={channel}
                    className={`rounded-md px-2 py-1.5 text-xs ${
                      channel === "inc-checkout-api" ? "bg-[#1264a3] text-white" : "text-[#d8c4d9]"
                    }`}
                  >
                    <span className="mr-2 opacity-60">#</span>
                    {channel}
                  </div>
                ))}
              </div>
              <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#a98eab]">Apps</p>
              <div className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white">
                <span className="size-2 rounded-sm bg-emerald-400" />
                OpsPilot
              </div>
            </aside>

            <div className="min-w-0 bg-[#11141b]">
              <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 sm:px-6">
                <div>
                  <p className="text-sm font-semibold text-white"># inc-checkout-api</p>
                  <p className="text-[10px] text-slate-500">Checkout incident coordination</p>
                </div>
                <span className="rounded-md border border-red-400/20 bg-red-400/10 px-2 py-1 font-mono text-[10px] text-red-300">
                  SEV-1
                </span>
              </div>

              <div className="space-y-6 p-4 sm:p-6">
                <div className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-300 to-rose-400 text-xs font-bold text-slate-950">MC</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">Maya Chen <span className="ml-1 font-normal text-slate-600">10:14 AM</span></p>
                    <p className="mt-1 text-sm text-slate-300">
                      <span className="rounded bg-cyan-300/10 px-1 text-cyan-200">@OpsPilot</span>{" "}
                      investigate checkout failures after the latest deploy
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <BrandMark />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200">
                      OpsPilot <span className="ml-1 rounded bg-violet-400/15 px-1.5 py-0.5 text-[9px] uppercase text-violet-200">App</span>
                      <span className="ml-2 font-normal text-slate-600">10:14 AM</span>
                    </p>
                    <div className="mt-2 rounded-xl border border-white/10 bg-white/[.025] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">Checkout API returning HTTP 500</p>
                        <span className="rounded bg-red-400/10 px-2 py-1 font-mono text-[10px] text-red-300">SEV-1 · 91%</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Multiple signals point to a database pool regression introduced by the 2.19.0 production rollout.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {[
                          ["Impact", "12.6k failed requests"],
                          ["Owner", "Checkout Platform"],
                          ["Next update", "10:29 AM"],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg bg-black/20 p-2.5">
                            <p className="text-[9px] uppercase tracking-wider text-slate-600">{label}</p>
                            <p className="mt-1 text-[11px] text-slate-300">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          "Open incident room",
                          "Draft postmortem",
                          "Resolve incident",
                        ].map((action) => (
                          <span key={action} className="rounded-md border border-white/10 bg-white/[.035] px-2.5 py-1.5 text-[10px] text-slate-300">
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative -mt-8 grid gap-3 px-3 sm:grid-cols-3 sm:px-8 lg:-mt-12 lg:px-14">
          <SlackCard eyebrow="Investigation result" title="Evidence-backed hypothesis" accent="violet">
            Deployment timing, pool timeouts, and a matching prior incident converge on the same likely cause.
          </SlackCard>
          <SlackCard eyebrow="Incident channel" title="# inc-checkout-api-0703" accent="emerald">
            Responders, owners, impact, and the initial action checklist arrive in one coordinated channel.
          </SlackCard>
          <SlackCard eyebrow="Postmortem" title="Draft ready for review" accent="amber">
            Summary, impact, timeline, root cause, resolution, and follow-ups are assembled from the incident context.
          </SlackCard>
        </div>
      </div>
    </section>
  );
}

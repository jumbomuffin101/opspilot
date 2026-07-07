interface AddToSlackButtonProps {
  compact?: boolean;
}

function SlackGlyph() {
  return (
    <span aria-hidden="true" className="grid size-4 grid-cols-2 gap-0.5">
      <span className="rounded-sm bg-[#36C5F0]" />
      <span className="rounded-sm bg-[#2EB67D]" />
      <span className="rounded-sm bg-[#E01E5A]" />
      <span className="rounded-sm bg-[#ECB22E]" />
    </span>
  );
}

export function AddToSlackButton({ compact = false }: AddToSlackButtonProps) {
  const installUrl = process.env.NEXT_PUBLIC_SLACK_INSTALL_URL?.trim();
  const href = installUrl || "/api/slack/install";
  const buttonClassName = `inline-flex items-center justify-center gap-2 rounded-xl bg-white font-semibold text-slate-950 shadow-[0_12px_40px_rgba(255,255,255,.12)] transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 ${
    compact ? "px-4 py-2.5 text-sm" : "px-5 py-3.5 text-sm sm:text-base"
  }`;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <a
        className={`${buttonClassName} hover:-translate-y-0.5 hover:bg-slate-100`}
        href={href}
        title="Install OpsPilot into your Slack workspace."
      >
        <SlackGlyph />
        Add to Slack
      </a>
      {!installUrl ? (
        <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-violet-200">
          Developer Preview
        </span>
      ) : null}
    </div>
  );
}

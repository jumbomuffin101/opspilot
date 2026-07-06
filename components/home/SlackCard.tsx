import type { ReactNode } from "react";

interface SlackCardProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
  accent?: "violet" | "emerald" | "amber";
}

const accentStyles = {
  violet: "bg-violet-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
} as const;

export function SlackCard({
  eyebrow,
  title,
  children,
  accent = "violet",
}: SlackCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#151820] p-4 shadow-[0_18px_55px_rgba(0,0,0,.22)] sm:p-5">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${accentStyles[accent]}`} />
        <span className="font-mono text-[10px] uppercase tracking-[.18em] text-slate-500">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-100">{title}</h3>
      <div className="mt-3 text-xs leading-5 text-slate-400">{children}</div>
    </article>
  );
}

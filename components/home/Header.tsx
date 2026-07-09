import { AddToSlackButton } from "@/components/home/AddToSlackButton";
import { BrandMark } from "@/components/home/BrandMark";

const navigation = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Why Slack", href: "#why-slack" },
  { label: "Commands", href: "/commands" },
] as const;

export function Header() {
  return (
    <header className="relative z-30 border-b border-white/[.06]">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8"
      >
        <a href="#top" className="flex items-center gap-3 text-sm font-semibold tracking-tight">
          <BrandMark />
          <span>OpsPilot</span>
        </a>
        <div className="hidden items-center gap-7 text-sm text-slate-400 lg:flex">
          {navigation.map((item) => (
            <a key={item.href} className="transition hover:text-white" href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="hidden sm:block">
          <AddToSlackButton compact />
        </div>
        <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs text-slate-300 sm:hidden">
          Slack-first
        </span>
      </nav>
    </header>
  );
}

import { BrandMark } from "@/components/home/BrandMark";
import {
  DEVPOST_URL,
  DOCUMENTATION_URL,
  GITHUB_URL,
  LICENSE_URL,
} from "@/components/home/links";

const footerLinks = [
  { label: "Commands", href: "/commands", external: false },
  { label: "Documentation", href: DOCUMENTATION_URL, external: true },
  { label: "GitHub", href: GITHUB_URL, external: true },
  { label: "Devpost", href: DEVPOST_URL, external: true },
  { label: "License", href: LICENSE_URL, external: true },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/[.07] bg-black/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <a href="#top" className="flex items-center gap-3 text-sm font-semibold text-white">
            <BrandMark />
            OpsPilot
          </a>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external === false ? undefined : "_blank"}
                rel={link.external === false ? undefined : "noreferrer"}
                className="transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/[.07] pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Built for the Slack Agent Builder Challenge</p>
          <p>Slack-native AI incident command · 2026</p>
        </div>
      </div>
    </footer>
  );
}

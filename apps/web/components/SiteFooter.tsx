import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { StartLink } from "@/components/SiteHeader";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Research" },
      { href: "/#solutions", label: "Solution" },
      { href: "/#features", label: "Features" },
    ],
  },
  {
    title: "Desk",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Get started" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-ink-900/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-sm">
            <Wordmark className="h-7 w-auto" />
            <p className="mt-4 text-sm leading-relaxed text-mute">
              Describe the idea. The desk builds the rule, draws the line, and tests it.
            </p>
          </div>
          <StartLink />
        </div>
        <div className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-8">
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-text/90 transition-colors hover:text-text">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5">
          <p className="text-xs text-mute">© 2026 MoleculeAI</p>
        </div>
      </div>
    </footer>
  );
}

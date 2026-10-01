import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Research" },
      { href: "/#why", label: "Why Molecule" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Desk",
    links: [
      { href: "/login", label: "Get started" },
      { href: "/#faq", label: "FAQ" },
      { href: "/pricing", label: "Plans" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/#faq", label: "Questions" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 md:grid-cols-4 md:px-8">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
            Describe a trading idea. Molecule builds it, simulates it, and keeps the paper book in one place.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">{col.title}</p>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={col.title + link.label}>
                  <Link href={link.href} className="text-sm text-mute transition-colors hover:text-text">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-mute sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span>© {new Date().getFullYear()} Molecule</span>
          <span>Research and paper simulation. Not a broker.</span>
        </div>
      </div>
    </footer>
  );
}

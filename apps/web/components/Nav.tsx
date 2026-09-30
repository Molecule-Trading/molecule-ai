"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/research", label: "Research" },
  { href: "/runs", label: "Runs" },
  { href: "/markets", label: "Markets" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-ink-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/research" className="font-mono text-sm tracking-wide text-text">
          MOLECULE AI
        </Link>
        <nav className="flex gap-5 text-sm text-mute">
          {LINKS.map((l) => {
            const active = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} className={active ? "text-text" : "hover:text-text"}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

const LINKS = [
  { href: "/research", label: "Research" },
  { href: "/runs", label: "Strategies" },
  { href: "/settings", label: "Settings" },
];

export function AppChrome({
  right,
}: {
  right?: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <header className="flex items-center justify-between border-b border-line px-4 py-3 md:px-5">
      <Wordmark />
      <div className="flex items-center gap-3">
        <nav className="hidden items-center gap-5 text-sm text-mute sm:flex">
          {LINKS.map((l) => {
            const on = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} className={on ? "text-text" : "hover:text-text"}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        {right}
      </div>
    </header>
  );
}

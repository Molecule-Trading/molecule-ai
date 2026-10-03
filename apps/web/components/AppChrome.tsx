"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

const LINKS = [
  { href: "/research", label: "Research" },
  { href: "/runs", label: "Strategies" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/settings", label: "Settings" },
];

export const frameClass = "w-full px-4 sm:px-5 md:px-8";

export function AppChrome() {
  const path = usePathname();
  return (
    <div className={`${frameClass} py-3 sm:py-4`}>
      <div className="flex items-center justify-between gap-3">
        <Wordmark className="h-6 w-auto sm:h-8" />
        <nav className="hidden items-center gap-5 text-sm text-mute sm:flex" aria-label="Desk">
          {LINKS.map((l) => {
            const on = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap transition-colors duration-200 ${on ? "font-medium text-text" : "hover:text-text"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <nav className="mt-3 grid grid-cols-4 gap-1 rounded-full border border-line bg-ink-900 p-1 text-[12px] sm:hidden" aria-label="Desk">
        {LINKS.map((l) => {
          const on = path === l.href || path.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`truncate rounded-full px-1 py-2 text-center ${on ? "bg-ink-800 font-medium text-text" : "text-mute"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

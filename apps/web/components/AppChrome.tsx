"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";

const LINKS = [
  { href: "/research", label: "Research" },
  { href: "/runs", label: "Strategies" },
  { href: "/settings", label: "Settings" },
];

export const frameClass = "mx-auto w-full max-w-6xl px-4 md:px-6";

export function AppChrome() {
  const path = usePathname();
  return (
    <div className={`${frameClass} flex items-center justify-between gap-4 py-4`}>
      <Wordmark />
      <div className="flex items-center gap-4 sm:gap-5">
        <nav className="flex items-center gap-3 text-sm text-mute sm:gap-4">
          {LINKS.map((l) => {
            const on = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap ${on ? "font-medium text-text" : "hover:text-text"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </div>
  );
}

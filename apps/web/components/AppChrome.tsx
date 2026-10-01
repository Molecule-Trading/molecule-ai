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

export const frameClass = "w-full px-5 md:px-8";

export function AppChrome() {
  const path = usePathname();
  return (
    <div className={`${frameClass} flex items-center justify-between gap-4 py-4`}>
      <Wordmark />
      <nav className="flex items-center gap-3 text-sm text-mute sm:gap-5">
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
    </div>
  );
}

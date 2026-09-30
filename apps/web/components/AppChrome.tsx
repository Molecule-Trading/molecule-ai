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

export function AppChrome({ right }: { right?: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
      <Wordmark />
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
        <nav className="flex items-center gap-4 text-sm text-mute">
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
        <ThemeToggle />
      </div>
    </div>
  );
}

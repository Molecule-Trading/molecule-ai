"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const LINKS = [
  { href: "/research", label: "Research" },
  { href: "/runs", label: "Runs" },
  { href: "/markets", label: "Markets" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  const [pill, setPill] = useState("…");

  useEffect(() => {
    api<{ mode?: string; grok?: boolean }>("/health")
      .then((h) => {
        if (h.mode === "ui-only") setPill("Fixture");
        else if (h.grok) setPill("Grok");
        else setPill("Engine");
      })
      .catch(() => setPill("Offline"));
  }, []);

  return (
    <header className="border-b border-line bg-ink-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href="/research" className="font-mono text-sm tracking-[0.14em] text-text">
          MOLECULE AI
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
          <span className="border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mute">
            {pill}
          </span>
        </div>
      </div>
    </header>
  );
}

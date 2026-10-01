"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { loadSession } from "@/lib/desk";

export function SiteHeader() {
  const [inDesk, setInDesk] = useState(false);

  useEffect(() => {
    setInDesk(Boolean(loadSession()));
  }, []);

  return (
    <header className="flex w-full items-center justify-between px-5 py-4 md:px-8">
      <Wordmark />
      <nav className="flex items-center gap-5 text-sm text-mute">
        <Link href="/pricing" className="hover:text-text">
          Pricing
        </Link>
        {inDesk ? (
          <Link href="/research" className="rounded-full bg-text px-4 py-2 font-medium text-ink-950">
            Open desk
          </Link>
        ) : (
          <Link href="/login" className="rounded-full bg-text px-4 py-2 font-medium text-ink-950">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}

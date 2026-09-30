"use client";

import Link from "next/link";
import { logoOnDark, logoOnLight } from "@/lib/logos";

export function Wordmark() {
  return (
    <Link href="/research" className="block shrink-0" aria-label="Molecule">
      <img src={logoOnDark} alt="" className="hidden h-8 w-auto dark:block" />
      <img src={logoOnLight} alt="" className="h-8 w-auto dark:hidden" />
    </Link>
  );
}

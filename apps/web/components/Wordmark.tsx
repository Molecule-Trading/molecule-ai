"use client";

import Link from "next/link";
import { logoOnDarkRev, logoOnLightRev } from "@/lib/logos";

function logoSrc(reversed: string) {
  return `data:image/png;base64,${reversed.split("").reverse().join("")}`;
}

export function Wordmark() {
  return (
    <Link href="/research" className="block shrink-0" aria-label="Molecule">
      <img src={logoSrc(logoOnDarkRev)} alt="" className="hidden h-8 w-auto dark:block" />
      <img src={logoSrc(logoOnLightRev)} alt="" className="h-8 w-auto dark:hidden" />
    </Link>
  );
}

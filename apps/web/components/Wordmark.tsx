"use client";

import Link from "next/link";
import { logoOnDarkRev } from "@/lib/logos";

function logoSrc(reversed: string) {
  return `data:image/png;base64,${reversed.split("").reverse().join("")}`;
}

export function Wordmark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <Link href="/" className="block shrink-0" aria-label="Molecule">
      <img src={logoSrc(logoOnDarkRev)} alt="" className={className} />
    </Link>
  );
}

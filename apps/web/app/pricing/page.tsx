"use client";

import { Pricing } from "@/components/Pricing";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 md:px-8 md:py-20">
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}

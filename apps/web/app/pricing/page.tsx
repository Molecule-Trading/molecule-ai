"use client";

import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Pricing } from "@/components/Pricing";
import { loadSession } from "@/lib/desk";

export default function PricingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="px-5 md:px-8">
        <Pricing onBack={() => router.push(loadSession() ? "/settings?tab=billing" : "/")} />
      </main>
      <SiteFooter />
    </div>
  );
}

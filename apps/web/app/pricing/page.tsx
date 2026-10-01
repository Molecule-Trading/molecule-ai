"use client";

import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Pricing } from "@/components/Pricing";

export default function PricingPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 px-5 md:px-8">
        <Pricing onBack={() => router.push("/")} />
      </main>
      <SiteFooter />
    </div>
  );
}

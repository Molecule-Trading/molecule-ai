"use client";

import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Pricing } from "@/components/Pricing";

export default function PricingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="px-5 md:px-8">
        <Pricing onBack={() => router.push("/settings?tab=billing")} />
      </main>
    </div>
  );
}

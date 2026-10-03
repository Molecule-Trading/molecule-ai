"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Features } from "@/components/Features";
import { Showcase } from "@/components/Showcase";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Solution } from "@/components/Solution";

export default function Home() {
  useEffect(() => {
    document.documentElement.classList.add("m-motion");
    return () => document.documentElement.classList.remove("m-motion");
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-2 pt-16 text-center md:px-8 md:pt-28">
            <h1
              className="hero-in font-sans text-[clamp(2.7rem,6.6vw,5.35rem)] font-medium leading-[1.04] tracking-[-0.035em] text-text"
              style={{ animationDelay: "40ms" }}
            >
              Frontier AI model
              <br />
              for agentic <span className="underline decoration-white/90 decoration-[1.5px] underline-offset-[0.14em]">trading.</span>
            </h1>
            <p
              className="hero-in mt-6 max-w-xl text-base leading-relaxed text-mute sm:text-lg"
              style={{ animationDelay: "140ms" }}
            >
              Describe a trading idea in natural language. MoleculeAI builds the strategy, simulates it, and tests it.
            </p>
            <div className="hero-in mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "220ms" }}>
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:opacity-90"
              >
                Get started for free
                <span aria-hidden>›</span>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center rounded-full bg-[#1c1e22] px-5 text-sm font-medium text-text transition hover:bg-[#26292e]"
              >
                View pricing
              </Link>
            </div>
          </div>
          <div id="product" className="mx-auto mt-14 w-full max-w-6xl scroll-mt-20 px-5 pb-24 md:mt-20 md:px-8">
            <Showcase />
          </div>
        </section>

        <Solution />

        <Features />

      </main>
      <SiteFooter />
    </div>
  );
}

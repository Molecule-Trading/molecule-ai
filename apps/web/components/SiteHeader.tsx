"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#solutions", label: "Solution" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "FAQ" },
];

export function StartLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/login"
      className={`inline-flex h-9 items-center justify-center rounded-full bg-text px-3.5 text-[13px] font-medium text-ink-950 transition duration-150 ease-out hover:opacity-90 active:scale-[0.96] ${className}`}
    >
      Get started for free
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    const ids = ["product", "solutions", "features", "faq"];
    const nodes = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el != null);
    if (nodes.length === 0) {
      setSection("");
      return;
    }
    const seen = new Map<string, number>();
    const pick = () => {
      let best = "";
      let score = 0;
      seen.forEach((value, id) => {
        if (value > score) {
          score = value;
          best = id;
        }
      });
      setSection(score > 0 ? best : "");
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          seen.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        pick();
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.6] },
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [path]);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-200 ${
        scrolled || open ? "border-b border-line bg-ink-950/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="relative flex h-16 items-center px-5 md:px-8">
        <Wordmark className="h-7 w-auto sm:h-8" />

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-ink-900/80 px-1.5 py-1 backdrop-blur-md lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((item) => {
            const active = section.length > 0 && item.href === `/#${section}`;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                  active ? "bg-ink-800 text-text" : "text-mute hover:bg-ink-800 hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3.5 w-4">
              <span
                className={`absolute left-0 h-px w-4 bg-current transition duration-200 ${open ? "top-1.5 rotate-45" : "top-0"}`}
              />
              <span
                className={`absolute left-0 top-1.5 h-px w-4 bg-current transition duration-200 ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`absolute left-0 h-px w-4 bg-current transition duration-200 ${open ? "top-1.5 -rotate-45" : "top-3"}`}
              />
            </span>
          </button>
          <div className="hidden sm:block">
            <StartLink />
          </div>
        </div>
      </div>

      <div
        id="site-menu"
        className={`grid overflow-hidden border-line transition-[grid-template-rows] duration-200 ease-out lg:hidden ${
          open ? "grid-rows-[1fr] border-t" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <nav className="flex flex-col px-3 py-2" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base text-mute transition-colors hover:bg-ink-900 hover:text-text"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

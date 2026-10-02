"use client";

import { useState, type FormEvent } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ContactPage() {
  const [ready, setReady] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = encodeURIComponent(name ? `MoleculeAI — ${name}` : "MoleculeAI");
    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` · ${email}` : ""}`);
    window.location.href = `mailto:nuneschrisler@gmail.com?subject=${subject}&body=${body}`;
    setReady(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Contact</p>
        <h1 className="mt-4 max-w-xl font-serif text-5xl font-medium leading-[1.02] tracking-tight md:text-6xl">Talk to the desk.</h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-mute">
          A question about the product, a book, or a partnership. It comes straight through.
        </p>
        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
          <div className="grid gap-3">
            <a href="mailto:nuneschrisler@gmail.com" className="rounded-2xl border border-line bg-ink-900 px-5 py-5 transition-colors hover:border-white/20">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Email</p>
              <p className="mt-2 text-lg">nuneschrisler@gmail.com</p>
            </a>
            <a href="https://x.com/chrislernunes" className="rounded-2xl border border-line bg-ink-900 px-5 py-5 transition-colors hover:border-white/20">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">X</p>
              <p className="mt-2 text-lg">@chrislernunes</p>
            </a>
          </div>
          <form onSubmit={submit} className="rounded-[22px] border border-white/[0.08] bg-[#121316] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-8">
            <label className="block text-sm text-mute" htmlFor="name">
              Name
              <input id="name" name="name" required autoComplete="name" className="mt-2 w-full rounded-xl border border-line bg-ink-950 px-3 py-2.5 text-sm text-text outline-none focus:border-white/30" />
            </label>
            <label className="mt-4 block text-sm text-mute" htmlFor="email">
              Email
              <input id="email" name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-xl border border-line bg-ink-950 px-3 py-2.5 text-sm text-text outline-none focus:border-white/30" />
            </label>
            <label className="mt-4 block text-sm text-mute" htmlFor="message">
              Message
              <textarea id="message" name="message" required rows={5} className="mt-2 w-full resize-none rounded-xl border border-line bg-ink-950 px-3 py-2.5 text-sm text-text outline-none focus:border-white/30" />
            </label>
            <button type="submit" className="mt-6 inline-flex h-10 items-center rounded-full bg-text px-4 text-sm font-medium text-ink-950 transition hover:opacity-90">
              Send
            </button>
            {ready && <p className="mt-4 text-sm text-mute">Your mail app should open with this note.</p>}
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

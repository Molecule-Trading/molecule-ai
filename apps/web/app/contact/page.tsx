"use client";

import { useState, type FormEvent } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ContactPage() {
  const [ready, setReady] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReady(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 md:px-8 md:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Contact</p>
        <h1 className="mt-4 max-w-xl font-serif text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">Talk to the desk.</h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-mute">
          A question about the product, a book, or a partnership. Leave it here. The desk reads every note.
        </p>
        <form
          onSubmit={submit}
          className="mt-12 max-w-xl rounded-[22px] border border-white/[0.08] bg-[#121316] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-8"
        >
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
            <textarea id="message" name="message" required rows={6} className="mt-2 w-full resize-none rounded-xl border border-line bg-ink-950 px-3 py-2.5 text-sm text-text outline-none focus:border-white/30" />
          </label>
          <div className="mt-6 flex items-center justify-between gap-4">
            <button type="submit" className="inline-flex h-10 items-center rounded-full bg-text px-4 text-sm font-medium text-ink-950 transition hover:opacity-90">
              Send
            </button>
            {ready && <p className="text-sm text-mute">Noted. The desk has the message.</p>}
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

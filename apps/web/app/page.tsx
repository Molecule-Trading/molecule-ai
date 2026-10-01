import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 md:px-8">
        <section className="pt-20 md:pt-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">Molecule</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
            A desk for the hypothesis, then the book.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-mute">
            Write the idea. Backtest it on recorded history. Deploy what holds up to paper, and keep the book in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-full bg-text px-5 py-2.5 text-sm font-medium text-ink-950">
              Sign in
            </Link>
            <Link href="/pricing" className="rounded-full border border-line px-5 py-2.5 text-sm text-text">
              Pricing
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-px border border-line bg-line md:grid-cols-3">
          {[
            ["Research", "A single compose field. Attach a note, or dictate the hypothesis."],
            ["Strategies", "Each backtest stays a card, with the engine’s own numbers."],
            ["Paper", "Deploy a strategy to the book. Stop it when the idea is done."],
          ].map(([title, body]) => (
            <article key={title} className="bg-ink-950 px-6 py-8">
              <h2 className="font-serif text-2xl">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-mute">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-24 border-t border-line pt-16">
          <p className="max-w-2xl font-serif text-3xl leading-snug md:text-4xl">
            No invented P&L. If the engine did not run it, the desk does not print a number.
          </p>
          <Link href="/login" className="mt-8 inline-block text-sm text-text underline">
            Enter the desk
          </Link>
        </section>
      </main>
      <footer className="border-t border-line px-5 py-6 text-xs text-mute md:px-8">
        Molecule desk · paper and research
      </footer>
    </div>
  );
}

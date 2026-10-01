import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="flex h-16 w-full items-center justify-between gap-6 px-5 md:px-8">
        <div className="flex shrink-0 items-center gap-4">
          <Wordmark className="h-7 w-auto" />
          <a href="https://x.com/chrislernunes" aria-label="X" className="text-mute transition-colors hover:text-text">
            <XIcon />
          </a>
          <a href="mailto:nuneschrisler@gmail.com" aria-label="Email" className="text-mute transition-colors hover:text-text">
            <Mail />
          </a>
        </div>
        <nav className="flex items-center gap-x-6 text-sm text-mute" aria-label="Legal">
          <Link href="/terms" className="transition-colors hover:text-text">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-text">
            Privacy
          </Link>
          <span className="hidden sm:inline">© {new Date().getFullYear()} MoleculeAI</span>
        </nav>
      </div>
    </footer>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.7 10.3 22.4 1.5h-1.8l-6.7 7.6L8.4 1.5H1.6l8.1 11.5L1.6 22.5h1.8l7.1-8.1 5.7 8.1h6.8l-8.3-12.2Zm-2.5 2.8-.8-1.1L4.1 2.9h2.8l5.2 7.3.8 1.1 6.8 9.5h-2.8l-5.5-7.7Z" />
    </svg>
  );
}

function Mail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

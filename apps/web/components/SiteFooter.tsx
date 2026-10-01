import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-5">
          <Wordmark className="h-7 w-auto" />
          <div className="flex items-center gap-3 text-mute">
            <a
              href="https://www.linkedin.com/in/chrislernunes"
              aria-label="LinkedIn"
              className="transition-colors hover:text-text"
            >
              <LinkedIn />
            </a>
            <a href="mailto:nuneschrisler@gmail.com" aria-label="Email" className="transition-colors hover:text-text">
              <Mail />
            </a>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-mute" aria-label="Legal">
          <Link href="/terms" className="transition-colors hover:text-text">
            Terms of Service
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-text">
            Privacy Policy
          </Link>
          <span>Copyright © {new Date().getFullYear()} MoleculeAI. All rights reserved.</span>
        </nav>
      </div>
    </footer>
  );
}

function LinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.7 3.3A2.2 2.2 0 1 0 4.7 7.7 2.2 2.2 0 0 0 4.7 3.3ZM3 9h3.4v12H3V9Zm6.2 0H12.5v1.6h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5V21H16v-6.3c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V21H9.2V9Z" />
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

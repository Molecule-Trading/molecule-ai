"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";

function resolveDark(mode: ThemeMode) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode: ThemeMode) {
  const dark = resolveDark(mode);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
  document.documentElement.dataset.theme = mode;
  return dark;
}

function Sun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 2.2a9.2 9.2 0 1 0 5.3 15.4A8.4 8.4 0 0 1 16.5 2.2z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = (localStorage.getItem("molecule.theme") as ThemeMode) || "system";
    setDark(applyTheme(saved));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem("molecule.theme") as ThemeMode) || "system";
      if (current === "system") setDark(applyTheme("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: ThemeMode = dark ? "light" : "dark";
    localStorage.setItem("molecule.theme", next);
    setDark(applyTheme(next));
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className="relative h-8 w-14 shrink-0 rounded-full border border-line bg-ink-800"
    >
      <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-mute ${dark ? "opacity-70" : "opacity-0"}`}>
        <Sun />
      </span>
      <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-mute ${dark ? "opacity-0" : "opacity-70"}`}>
        <Moon />
      </span>
      <span
        className={`absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-text text-ink-950 shadow-sm transition-transform duration-200 ease-out ${
          dark ? "translate-x-7" : "translate-x-1"
        }`}
      >
        {dark ? <Moon /> : <Sun />}
      </span>
    </button>
  );
}

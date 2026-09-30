"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";

const MODES: ThemeMode[] = ["dark", "light", "system"];

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
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("molecule.theme") as ThemeMode) || "system";
    setMode(saved);
    applyTheme(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem("molecule.theme") as ThemeMode) || "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function choose(next: ThemeMode) {
    localStorage.setItem("molecule.theme", next);
    setMode(next);
    applyTheme(next);
  }

  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-mute">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => choose(m)}
          className={mode === m ? "text-text" : "hover:text-text"}
          aria-pressed={mode === m}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

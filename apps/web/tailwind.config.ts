import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "var(--bg)",
          900: "var(--bg-2)",
          800: "var(--bg-3)",
          700: "var(--bg-4)",
        },
        line: "var(--line)",
        mute: "var(--mute)",
        text: "var(--fg)",
        accent: "#c9a227",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui"],
        serif: ["IBM Plex Serif", "Georgia", "ui-serif", "serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

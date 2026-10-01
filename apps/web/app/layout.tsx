import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoleculeAI",
  description: "Describe a trading idea. MoleculeAI builds the strategy, simulates it, and tests it.",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

const themeBoot = `(function(){try{var r=document.documentElement;r.classList.add("dark");r.classList.remove("light");r.dataset.theme="dark";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Molecule",
  description: "Research and historical backtesting desk",
  icons: { icon: "/icon.svg" },
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

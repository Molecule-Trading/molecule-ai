import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Molecule",
  description: "Research and historical backtesting desk",
  icons: { icon: "/icon.svg" },
};

const themeBoot = `(function(){try{var t=localStorage.getItem("molecule.theme")||"system";var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.classList.toggle("light",!d);r.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

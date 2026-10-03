import Link from "next/link";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Product" },
      { href: "/#solutions", label: "Solution" },
      { href: "/#features", label: "Features" },
    ],
  },
  {
    title: "Desk",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-foot mt-auto">
      <div className="top">
        <div>
          <div className="brand">
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="11" fill="#eceef1" />
              <rect x="1" y="10.6" width="22" height="2.8" fill="#0a0b0d" />
            </svg>
            Molecule
          </div>
          <p className="tag">Describe the idea. The desk builds the rule, draws the line, and tests it.</p>
        </div>
        <nav className="cols" aria-label="Footer">
          {COLS.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="bar">
        <span>© 2026 MoleculeAI</span>
      </div>
      <div className="mark" aria-hidden>
        Molecule
      </div>
    </footer>
  );
}

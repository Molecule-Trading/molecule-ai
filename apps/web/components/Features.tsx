"use client";

import { useEffect, useRef } from "react";

const NODES: [string, number, number][] = [
  ["Price", 270, 50],
  ["Volatility", 330, 68],
  ["Macro", 30, 54],
  ["News", 90, 52],
  ["Rates", 150, 52],
  ["Flow", 210, 46],
];

export function Features() {
  const root = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const sec = root.current;
    const svg = svgRef.current;
    if (!sec || !svg) return;
    const NS = "http://www.w3.org/2000/svg";
    const C = 200;
    const R = 100;
    svg.replaceChildren();
    const el = (t: string, a: Record<string, string | number>, p: Element = svg) => {
      const e = document.createElementNS(NS, t);
      for (const k in a) e.setAttribute(k, String(a[k]));
      p.append(e);
      return e;
    };
    const P = (a: number, r: number) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)];
    el("circle", { cx: C, cy: C, r: R, class: "ring" });
    el("circle", { cx: C, cy: C, r: 75, class: "ring2" });
    const spokes = NODES.map(([, a]) => {
      const [x1, y1] = P(a, 30);
      const [x2, y2] = P(a, R);
      return el("line", { x1, y1, x2, y2, class: "spoke" });
    });
    el("circle", { cx: C, cy: C, r: 28, class: "core" });
    el("circle", { cx: C, cy: C, r: 9.5, fill: "#eceef1" });
    el("rect", { x: C - 9.5, y: C - 1.4, width: 19, height: 2.8, fill: "#0b0c0e" });
    const orb = el("g", { id: "orb" });
    [[16, 0.12], [9, 0.25], [4, 0.55]].forEach(([L, o]) =>
      el("circle", { cx: C, cy: C, r: R, pathLength: 100, class: "arc", "stroke-dasharray": `${L} ${100 - L}`, "stroke-dashoffset": L, opacity: o }, orb),
    );
    el("circle", { cx: C + R, cy: C, r: 7, fill: "#fff", opacity: 0.18 }, orb);
    el("circle", { cx: C + R, cy: C, r: 2.6, fill: "#fff" }, orb);
    const pills = NODES.map(([n, a, w], i) => {
      const [x, y] = P(a, R);
      const g = el("g", { class: "pill", style: `--i:${i}` });
      el("rect", { x: x - w / 2, y: y - 11, width: w, height: 22, rx: 11 }, g);
      const t = el("text", { x, y: y + 0.5, "text-anchor": "middle", "dominant-baseline": "central" }, g);
      t.textContent = n;
      return g;
    });
    let act = -1;
    const setActive = (i: number) => {
      act = i;
      pills.forEach((g, j) => g.classList.toggle("on", j === i));
      spokes.forEach((s, j) => s.classList.toggle("on", j === i));
    };
    const rot = (th: number) => orb.setAttribute("transform", `rotate(${th} ${C} ${C})`);
    let raf = 0;
    let stop = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = () => {
      sec.classList.add("in");
      if (reduce) {
        setActive(3);
        rot(110);
        sec.classList.add("run");
        return;
      }
      const wait = window.setTimeout(() => {
        sec.classList.add("run");
        let th = 245;
        let last = 0;
        const tick = (t: number) => {
          if (stop) return;
          const dt = Math.min(50, t - (last || t));
          last = t;
          th = (th + dt * 0.0375) % 360;
          rot(th);
          let bi = 0;
          let bd = 999;
          NODES.forEach(([, a], i) => {
            const d = (((th - a) % 360) + 360) % 360;
            if (d < bd) {
              bd = d;
              bi = i;
            }
          });
          if (bi !== act) setActive(bi);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, 1500);
      return wait;
    };
    let wait = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          wait = start() || 0;
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(sec);
    return () => {
      stop = true;
      io.disconnect();
      if (wait) window.clearTimeout(wait);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={root} id="features" className="feat scroll-mt-20">
      <div className="wrap">
        <div className="copy">
          <div className="eyebrow rv" style={{ ["--i" as string]: 0 }}>
            Features
          </div>
          <h2 className="rv" style={{ ["--i" as string]: 1 }}>
            The test reads more than price.
          </h2>
          <p className="rv" style={{ ["--i" as string]: 2 }}>
            Price, volatility, macro, news, rates, and flow. MoleculeAI keeps the inputs that change the book and leaves the rest out.
          </p>
        </div>
        <div className="viz rv" style={{ ["--i" as string]: 2 }}>
          <svg ref={svgRef} viewBox="0 0 400 400" role="img" aria-label="Six inputs orbiting the Molecule core: price, volatility, macro, news, rates and flow" />
        </div>
      </div>
    </section>
  );
}

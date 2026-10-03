"use client";

import { useEffect, useRef } from "react";

const CHEV = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Showcase() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    return mountShowcase(el);
  }, []);

  return (
    <div ref={root} className="desk-show">
      <div className="ds-grid">
        <article className="card" id="c1">
          <div className="body">
            <div className="u ty" data-s="1" data-k="type" data-t="Buy when the twenty-day return is positive and volatility is falling." />
            <div className="resp rv" data-s="2" data-k="resp">
              <i />
              <div className="bub">
                <div
                  className="cot"
                  data-ms="1100"
                  data-cot="search~Parsing the rule~Both gates: twenty-session return above zero, volatility below its median;db~Loading price history~Daily bars, Apr 2021 to Jul 2026;chart~Running the backtest~Costs applied on every position change"
                >
                  <button type="button" className="cth">
                    <span className="sh">Thinking</span>
                    {CHEV}
                  </button>
                  <div className="cbody" />
                </div>
                <div className="col">
                  <div className="wd" data-s="3" data-k="words" data-t="Long only when both gates are on." />
                  <div className="wd" data-s="4" data-k="words" data-t="<b>Entry</b> when the twenty-session return is above zero and realized volatility is below its own median." />
                  <div className="wd" data-s="5" data-k="words" data-t="<b>Exit</b> when either gate fails. Costs stay on the path." />
                </div>
              </div>
            </div>
            <div className="met rv" data-s="6" data-k="met">
              <div><small>CAGR</small><span className="n" data-v="3.34" data-d="2" data-p="+" data-x="%" /></div>
              <div><small>Sharpe</small><span className="n" data-v="0.44" data-d="2" /></div>
              <div><small>Sortino</small><span className="n" data-v="0.66" data-d="2" /></div>
              <div><small>Calmar</small><span className="n" data-v="0.21" data-d="2" /></div>
              <div><small>Max DD</small><span className="n" data-v="-15.81" data-d="2" data-x="%" /></div>
              <div><small>Trades</small><span className="n" data-v="149" data-d="0" data-plain="1" /></div>
            </div>
            <div className="row rv" data-s="7" data-k="draw">
              <div className="ch"><small>Equity curve</small><svg data-chart="eq" data-seed="67875" /></div>
              <div className="ch"><small>Underwater</small><svg data-chart="uw" data-seed="67875" /></div>
            </div>
            <div className="row rv" data-s="8" data-k="draw">
              <div className="ch"><small>Return distribution</small><svg data-chart="hist" data-kind="ret" data-seed="67875" /></div>
              <div className="ch"><small>Volatility distribution</small><svg data-chart="hist" data-kind="vol" data-seed="67875" /></div>
            </div>
          </div>
          <div className="foot"><span>Research</span><a href="/login">Explore →</a></div>
        </article>

        <article className="card" id="c2">
          <div className="body">
            <div className="pdf rv" data-s="1" data-k="show">
              <em>PDF</em>
              <div>strategy_note.pdf<small>Attached · 6 pages</small></div>
            </div>
            <div className="u ty" data-s="2" data-k="type" data-t="Backtest this strategy paper for me." />
            <div className="resp rv" data-s="3" data-k="resp">
              <i />
              <div className="bub">
                <div
                  className="cot"
                  data-ms="1100"
                  data-cot="file~Reading strategy_note.pdf~Six pages, rule found in the method section;search~Extracting the rule~Long when the 50-day average is above the 200-day;chart~Running the backtest~Fees applied at the next open"
                >
                  <button type="button" className="cth">
                    <span className="sh">Thinking</span>
                    {CHEV}
                  </button>
                  <div className="cbody" />
                </div>
                <div className="col">
                  <div className="wd" data-s="4" data-k="words" data-t="<b>The note became a daily rule.</b> Long when the fifty-day average is above the two-hundred-day average, flat otherwise." />
                  <div className="wd dim" data-s="5" data-k="words" data-t="Entry is the next open. Fees stay on the path. The line is the book." />
                </div>
              </div>
            </div>
            <div className="ch rv" data-s="6" data-k="draw">
              <small>Equity curve</small>
              <svg data-chart="eq" data-seed="4612" data-rule="trend" />
            </div>
            <div className="met rv" data-s="7" data-k="met">
              <div><small>Return</small><span className="n" data-v="36.42" data-d="2" data-p="+" data-x="%" /></div>
              <div><small>Sharpe</small><span className="n" data-v="0.81" data-d="2" /></div>
              <div><small>Max DD</small><span className="n" data-v="-13.15" data-d="2" data-x="%" /></div>
              <div><small>Trades</small><span className="n" data-v="11" data-d="0" data-plain="1" /></div>
            </div>
          </div>
          <div className="foot"><span>Paper</span><a href="/login">Explore →</a></div>
        </article>

        <article className="card" id="c3">
          <div className="body">
            <div className="u ty" data-s="1" data-k="type" data-t="Run a Monte Carlo on my crypto strategy, with in-sample and out-of-sample data." />
            <div className="resp rv" data-s="2" data-k="resp">
              <i />
              <div className="bub">
                <div
                  className="cot"
                  data-ms="1000"
                  data-cot="shuffle~Splitting the data~Seventy percent in-sample, thirty out-of-sample;shuffle~Resampling the returns~1,000 paths drawn from the daily book;chart~Taking percentiles~10th, median and 90th"
                >
                  <button type="button" className="cth">
                    <span className="sh">Thinking</span>
                    {CHEV}
                  </button>
                  <div className="cbody" />
                </div>
                <div className="col">
                  <div className="wd" data-s="3" data-k="words" data-t="<b>Paths redrawn from the daily book.</b> The split is seventy, thirty. The fan is the 10th, the median, and the 90th." />
                </div>
              </div>
            </div>
            <div className="ch rv" data-s="4" data-k="draw">
              <small>Monte Carlo</small>
              <svg data-chart="mc" data-seed="3" />
            </div>
            <div className="row rv" data-s="5" data-k="met">
              <div className="ch">
                <small>IN SAMPLE</small>
                <div className="n pos" data-v="6.27" data-d="2" data-p="+" data-x="%" style={{ fontSize: 16 }} />
                <small>Sharpe 0.83</small>
              </div>
              <div className="ch">
                <small>OUT OF SAMPLE</small>
                <div className="n neg" data-v="-2.85" data-d="2" data-x="%" style={{ fontSize: 16 }} />
                <small>Sharpe -0.27</small>
              </div>
            </div>
          </div>
          <div className="foot"><span>Simulate</span><a href="/login">Explore →</a></div>
        </article>

        <article className="card" id="c4">
          <div className="body">
            <div className="vs rv" data-s="1" data-k="voice">
              <div className="vis">
                <div className="orb"><i /></div>
                <div className="wv" />
                <div className="st">LISTENING</div>
              </div>
              <div className="tr" data-t="Buy Palantir before every earnings call over the last year. What does the return look like?" />
            </div>
            <div className="u vu" />
            <div className="resp rv" data-s="3" data-k="resp">
              <i />
              <div className="bub">
                <div className="dots"><s /><s /><s /></div>
                <div className="col">
                  <div className="wd" data-s="4" data-k="words" data-t="<b>Long the session before each print, flat the session after.</b> The line is that book." />
                </div>
              </div>
            </div>
            <div className="ch rv" data-s="5" data-k="draw">
              <small>Equity curve</small>
              <svg data-chart="eq" data-seed="930" />
            </div>
          </div>
          <div className="foot"><span>Voice</span><a href="/login">Explore →</a></div>
        </article>
      </div>
    </div>
  );
}

function mountShowcase(root: HTMLElement) {
  let stop = false;
  const timers = new Set<number>();
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      if (stop) return resolve();
      const id = window.setTimeout(() => {
        timers.delete(id);
        resolve();
      }, ms);
      timers.add(id);
    });

  const q = <T extends Element>(sel: string, r: ParentNode = root) => r.querySelector(sel) as T | null;
  const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const walk = (seed: number, n: number, d: number, v: number) => {
    const r = rng(seed);
    let x = 1;
    return Array.from({ length: n }, (_, i) => (i ? (x *= 1 + d + (r() - 0.5) * v) : 1));
  };
  const rg = (q0: number) => {
    const f = () => ((q0 = (q0 * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 30; i++) f();
    return f;
  };
  function gen(seed: number, rule?: string) {
    const n = 1330;
    const r = rg(seed);
    const z = () => (r() + r() + r() - 1.5) / 0.5;
    let lv = Math.log(0.009);
    const M: number[] = [];
    for (let i = 0; i < n; i++) {
      lv = lv * 0.97 + Math.log(0.009) * 0.03 + 0.07 * z();
      const s = Math.exp(lv);
      M.push(-0.00012 - 0.06 * (s - 0.009) + s * z());
    }
    const lc = [0];
    const c1 = [0];
    const c2 = [0];
    const B = [1];
    const pc = [0];
    for (let i = 0; i < n; i++) {
      lc.push(lc[i] + Math.log(1 + M[i]));
      c1.push(c1[i] + M[i]);
      c2.push(c2[i] + M[i] * M[i]);
      B.push(B[i] * (1 + M[i]));
    }
    for (let i = 0; i <= n; i++) pc.push(pc[i] + B[i]);
    const v20 = (i: number) => Math.sqrt(Math.max(0, (c2[i] - c2[i - 20]) / 20 - ((c1[i] - c1[i - 20]) / 20) ** 2));
    const vs: number[] = [];
    for (let i = 20; i < n; i++) vs.push(v20(i));
    const med = vs.slice().sort((a, b) => a - b)[vs.length >> 1];
    let p = 0;
    let s = 1;
    const S = [1];
    const R: number[] = [];
    for (let i = 0; i < n; i++) {
      const on =
        rule === "trend"
          ? i >= 200 && (pc[i + 1] - pc[i - 49]) / 50 > (pc[i + 1] - pc[i - 199]) / 200
          : i >= 20 && lc[i] - lc[i - 20] > 0 && v20(i) < med;
      const qq = on ? 1 : 0;
      const x = qq * M[i] - 0.0004 * Math.abs(qq - p);
      p = qq;
      R.push(x);
      s *= 1 + x;
      S.push(s);
    }
    return { B, S, R, M, med };
  }

  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (t: string, a: Record<string, string | number> = {}) => {
    const e = document.createElementNS(NS, t);
    for (const k in a) e.setAttribute(k, String(a[k]));
    return e;
  };
  const W = 300;
  const H = 110;
  const P = (a: number[], lo: number, hi: number) =>
    a
      .map((v, i) => `${i ? "L" : "M"}${(i / (a.length - 1) * W * 0.82).toFixed(1)} ${(H - ((v - lo) / (hi - lo)) * H).toFixed(1)}`)
      .join("");
  function grid(svg: SVGSVGElement, labels: string[], xl: string[]) {
    labels.forEach((t, i) => {
      const y = (i / (labels.length - 1)) * H;
      svg.append(svgEl("line", { class: "gl", x1: 0, x2: W, y1: y, y2: y }));
      const e = svgEl("text", { x: W, y: y + 3, "text-anchor": "end" });
      e.textContent = t;
      svg.append(e);
    });
    xl.forEach((t, i) => {
      const e = svgEl("text", { x: i * W * 0.4 + 14, y: H + 16 });
      e.textContent = t;
      svg.append(e);
    });
  }
  function add(svg: SVGSVGElement, d: string, c: string, fill?: boolean) {
    if (fill) svg.append(svgEl("path", { class: "fill", d: `${d}L${W * 0.82} 0L0 0Z`, fill: "rgba(242,118,92,.14)" }));
    svg.append(svgEl("path", { class: `p ${c}`, d, pathLength: 1 }));
  }

  root.querySelectorAll("svg[data-chart]").forEach((node) => {
    const svg = node as SVGSVGElement;
    svg.replaceChildren();
    const k = svg.dataset.chart;
    const sd = +(svg.dataset.seed || 1);
    svg.setAttribute("viewBox", `0 0 ${W} ${H + 22}`);
    const G = k === "mc" ? null : gen(sd, svg.dataset.rule);
    const ds = (a: number[]) => a.filter((_, i) => i % 4 === 0 || i === a.length - 1);
    const f = (v: number) => Math.round(v * 1e5).toLocaleString("en-US");
    if (!G && k !== "mc") return;
    if (k === "eq" && G) {
      const s = ds(G.S);
      const b = ds(G.B);
      const lo = Math.min(...s, ...b);
      const hi = Math.max(...s, ...b);
      grid(svg, [0, 1, 2, 3].map((i) => f(hi - ((hi - lo) * i) / 3)), ["Apr 21", "Dec 23", "Jul 26"]);
      add(svg, P(b, lo, hi), "b");
      add(svg, P(s, lo, hi), "s");
    } else if (k === "uw" && G) {
      let pk = 0;
      const a = ds(G.S.map((v) => ((pk = Math.max(pk, v)), v / pk - 1)));
      const m = Math.min(...a);
      grid(svg, [0, 1, 2, 3, 4].map((i) => `${((m * i) / 4 * 100).toFixed(1)}%`), ["Dec 22", "Jul 26"]);
      add(svg, P(a, m, 0), "uw", true);
    } else if (k === "hist" && G) {
      const vol = svg.dataset.kind === "vol";
      let v: number[];
      if (vol) {
        v = [];
        for (let i = 20; i < G.M.length; i++) {
          const w = G.M.slice(i - 20, i);
          const m = w.reduce((a, b) => a + b) / 20;
          v.push(Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / 20) * Math.sqrt(252) * 100);
        }
      } else v = G.R.filter((x) => x !== 0).map((x) => x * 100);
      const nb = 22;
      const lo = Math.min(...v);
      const hi = Math.max(...v);
      const bw = (hi - lo) / nb;
      const c = Array(nb).fill(0);
      v.forEach((x) => c[Math.min(nb - 1, Math.floor((x - lo) / bw))]++);
      const mx = Math.max(...c);
      svg.append(svgEl("line", { class: "gl", x1: 0, x2: W, y1: H, y2: H }));
      c.forEach((n, i) => {
        const h = (n / mx) * H;
        const x0 = lo + i * bw;
        const col = vol ? "#8b9098" : x0 + bw / 2 >= 0 ? "#3ddc97" : "#f2765c";
        const rect = svgEl("rect", {
          class: "bar",
          x: (i * W) / nb + 1,
          width: W / nb - 2,
          y: H - h,
          height: h,
          rx: 1.5,
          fill: col,
          "fill-opacity": 0.85,
        });
        rect.setAttribute("style", `transition-delay:${i * 30}ms`);
        svg.append(rect);
      });
      if (vol) {
        const mv = G.med * Math.sqrt(252) * 100;
        const x = ((mv - lo) / (hi - lo)) * W;
        svg.append(svgEl("line", { class: "med", x1: x, x2: x, y1: 0, y2: H }));
        const t = svgEl("text", { x: x + 4, y: 9 });
        t.textContent = "median";
        svg.append(t);
      }
      (
        [
          [0, lo, "start"],
          [W / 2, (lo + hi) / 2, "middle"],
          [W, hi, "end"],
        ] as const
      ).forEach(([x, t, a]) => {
        const e = svgEl("text", { x, y: H + 14, "text-anchor": a });
        e.textContent = `${t.toFixed(1)}%`;
        svg.append(e);
      });
    } else if (k === "mc") {
      const n = 120;
      const ps = Array.from({ length: 36 }, (_, i) => walk(sd + i * 13, n, 0.0007, 0.02));
      const qq = (frac: number) =>
        Array.from({ length: n }, (_, i) => {
          const col = ps.map((p) => p[i]).sort((x, y) => x - y);
          return col[Math.floor(frac * (col.length - 1))];
        });
      const lo = Math.min(...ps.flat());
      const hi = Math.max(...ps.flat());
      grid(svg, ["160,000", "120,000", "80,000", "40,000", "0"], ["Apr 21", "Dec 23", "Jul 26"]);
      const g = svgEl("g", { class: "fan" });
      ps.forEach((p) => g.append(svgEl("path", { d: P(p, lo, hi), fill: "none", stroke: "#4a4f57", "stroke-width": 0.5 })));
      svg.append(g);
      add(svg, P(qq(0.1), lo, hi), "q");
      add(svg, P(qq(0.9), lo, hi), "q");
      add(svg, P(qq(0.5), lo, hi), "md");
    }
  });

  root.querySelectorAll(".wv").forEach((w) => {
    w.replaceChildren();
    for (let i = 0; i < 33; i++) {
      const e = document.createElement("s");
      const k = Math.exp(-(((i - 16) / 9) ** 2));
      e.style.setProperty("--h", `${(5 + 26 * k * (0.45 + Math.random() * 0.55)).toFixed(0)}px`);
      e.style.setProperty("--d", `${(0.35 + Math.random() * 0.5).toFixed(2)}s`);
      e.style.animationDelay = `${(-Math.random()).toFixed(2)}s`;
      w.append(e);
    }
  });

  const fmt = (e: HTMLElement, t: number) => {
    const v = +(e.dataset.v || 0) * t;
    const s = v.toFixed(+(e.dataset.d || 0));
    e.textContent = (v > 0 && e.dataset.p ? e.dataset.p : "") + s + (e.dataset.x || "");
    if (e.dataset.plain) {
      e.classList.remove("pos", "neg");
      return;
    }
    const final = +(e.dataset.v || 0);
    e.classList.toggle("pos", final > 0);
    e.classList.toggle("neg", final < 0);
  };
  const sc = (e: Element) => {
    const b = e.closest(".body") as HTMLElement | null;
    if (b) b.scrollTop = b.scrollHeight;
  };
  async function typeTxt(e: HTMLElement, t: string, ms: number) {
    e.classList.add("typing");
    for (let i = 1; i <= t.length; i++) {
      if (stop) return;
      e.textContent = t.slice(0, i);
      sc(e);
      await sleep(ms);
    }
    e.classList.remove("typing");
  }
  async function words(e: HTMLElement, t: string, ms: number) {
    e.classList.add("streaming");
    const w = t.split(" ");
    for (let i = 1; i <= w.length; i++) {
      if (stop) return;
      e.innerHTML = w.slice(0, i).join(" ");
      sc(e);
      await sleep(ms);
    }
    e.classList.remove("streaming");
  }
  function draw(p: SVGPathElement) {
    p.style.transition = "none";
    p.style.strokeDashoffset = "1";
    p.getBoundingClientRect();
    p.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.3,.6,.2,1)";
    p.style.strokeDashoffset = "0";
  }
  async function count(box: HTMLElement, instant = false) {
    const ns = [...box.querySelectorAll(".n")] as HTMLElement[];
    if (instant) {
      ns.forEach((n) => fmt(n, 1));
      return;
    }
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (t: number) => {
        if (stop) return resolve();
        const k = Math.min(1, (t - t0) / 900);
        const e = 1 - (1 - k) ** 3;
        ns.forEach((n) => fmt(n, e));
        if (k < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }
  const IC: Record<string, string> = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    chart: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    spin: '<circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/>',
  };
  const ico = (n: string) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;
  async function think(c: HTMLElement) {
    const lab = q<HTMLElement>(".sh", c);
    const body = q<HTMLElement>(".cbody", c);
    if (!lab || !body) return;
    const ms = +(c.dataset.ms || 1000);
    const t0 = performance.now();
    for (const st of (c.dataset.cot || "").split(";")) {
      if (stop) return;
      const [ic, tt, it] = st.split("~");
      const d = document.createElement("div");
      d.className = "cs";
      d.innerHTML = `<div class="cst"><span class="cic spin">${ico("spin")}</span><span class="ct sh">${tt}</span></div><div class="cit">${it}</div>`;
      body.append(d);
      requestAnimationFrame(() => d.classList.add("in"));
      sc(c);
      await sleep(ms * 0.5);
      d.classList.add("show");
      sc(c);
      await sleep(ms * 0.5);
      const i = q<HTMLElement>(".cic", d);
      if (i) {
        i.innerHTML = ico(ic);
        i.classList.remove("spin");
      }
      q(".ct", d)?.classList.remove("sh");
    }
    lab.textContent = `Thought for ${((performance.now() - t0) / 1000).toFixed(1)}s`;
    c.classList.add("done");
    await sleep(400);
    c.classList.add("collapsed");
    await sleep(500);
  }

  async function go(e: HTMLElement, card: HTMLElement) {
    if (stop) return;
    const k = e.dataset.k;
    requestAnimationFrame(() => requestAnimationFrame(() => sc(e)));
    if (k === "type") await typeTxt(e, e.dataset.t || "", 22);
    else if (k === "words") await words(e, e.dataset.t || "", +(e.dataset.sp || 45));
    else if (k === "show") e.classList.add("on");
    else if (k === "resp") {
      e.classList.add("on");
      const d = q(".dots", e);
      const c = q<HTMLElement>(".cot", e);
      if (d) {
        await sleep(900);
        d.classList.add("x");
      } else if (c) await think(c);
    } else if (k === "voice") {
      e.classList.add("on", "live");
      const tr = q<HTMLElement>(".tr", e);
      const u = q<HTMLElement>(".vu", card);
      if (!tr || !u) return;
      await sleep(900);
      await words(tr, tr.dataset.t || "", 150);
      await sleep(500);
      e.classList.remove("live");
      const st = q<HTMLElement>(".st", e);
      if (st) st.textContent = "HEARD";
      await sleep(600);
      e.classList.add("sent");
      await sleep(700);
      const a = tr.getBoundingClientRect();
      u.textContent = tr.dataset.t || "";
      e.classList.add("gone");
      u.classList.add("on");
      const b = u.getBoundingClientRect();
      u.style.transition = "none";
      u.style.background = "transparent";
      u.style.transform = `translate(${a.left + a.width / 2 - b.left - b.width / 2}px,${a.top + a.height / 2 - b.top - b.height / 2}px)`;
      u.getBoundingClientRect();
      u.style.transition = "transform .75s cubic-bezier(.2,.7,.2,1),background .75s";
      u.style.transform = "";
      u.style.background = "";
      await sleep(800);
    } else if (k === "met") {
      e.classList.add("on");
      await count(e);
    } else if (k === "draw") {
      e.classList.add("on");
      e.querySelectorAll(".fan,.fill").forEach((x) => x.classList.add("on"));
      e.querySelectorAll(".p").forEach((p) => draw(p as SVGPathElement));
      e.querySelectorAll(".bar").forEach((x) => x.classList.add("g"));
      sc(e);
      await sleep(1900);
    }
  }

  function reset(card: HTMLElement) {
    card.querySelectorAll(".rv").forEach((e) => e.classList.remove("on", "live"));
    card.querySelectorAll(".ty,.wd,.tr").forEach((e) => {
      e.innerHTML = "";
    });
    card.querySelectorAll(".dots").forEach((d) => d.classList.remove("x"));
    card.querySelectorAll(".cot").forEach((c) => {
      c.classList.remove("done", "collapsed");
      const body = q(".cbody", c);
      if (body) body.innerHTML = "";
      const sh = q(".sh", c);
      if (sh) sh.textContent = "Thinking";
    });
    card.querySelectorAll(".vs").forEach((v) => v.classList.remove("sent", "gone", "live"));
    card.querySelectorAll(".vu").forEach((node) => {
      const u = node as HTMLElement;
      u.classList.remove("on");
      u.textContent = "";
      u.removeAttribute("style");
    });
    card.querySelectorAll(".st").forEach((e) => {
      e.textContent = "LISTENING";
    });
    const b = q<HTMLElement>(".body", card);
    if (b) {
      b.style.scrollBehavior = "auto";
      b.scrollTop = 0;
      b.style.scrollBehavior = "";
    }
    card.querySelectorAll(".p").forEach((node) => {
      const p = node as SVGPathElement;
      p.style.transition = "none";
      p.style.strokeDashoffset = "1";
    });
    card.querySelectorAll(".fan,.fill").forEach((x) => x.classList.remove("on"));
    card.querySelectorAll(".bar").forEach((x) => x.classList.remove("g"));
    card.querySelectorAll(".n").forEach((node) => {
      const n = node as HTMLElement;
      n.textContent = "";
      if (!n.classList.contains("pos") && !n.classList.contains("neg")) n.classList.remove("pos", "neg");
    });
  }

  function settle(card: HTMLElement) {
    reset(card);
    card.querySelectorAll<HTMLElement>("[data-k='type'],[data-k='words']").forEach((e) => {
      e.innerHTML = e.dataset.t || "";
    });
    const voice = q<HTMLElement>("[data-k='voice']", card);
    const u = q<HTMLElement>(".vu", card);
    if (voice && u) {
      u.textContent = q<HTMLElement>(".tr", voice)?.dataset.t || "";
      u.classList.add("on");
      voice.classList.add("gone");
    }
    card.querySelectorAll<HTMLElement>(".rv").forEach((e) => {
      if (!e.classList.contains("vs")) e.classList.add("on");
    });
    card.querySelectorAll(".dots").forEach((d) => d.classList.add("x"));
    card.querySelectorAll(".cot").forEach((c) => c.classList.add("done", "collapsed"));
    card.querySelectorAll<HTMLElement>("[data-k='met']").forEach((e) => {
      void count(e, true);
    });
    card.querySelectorAll(".fan,.fill,.bar").forEach((x) => x.classList.add(x.classList.contains("bar") ? "g" : "on"));
    card.querySelectorAll(".p").forEach((node) => {
      const p = node as SVGPathElement;
      p.style.transition = "none";
      p.style.strokeDashoffset = "0";
    });
  }

  const onClick = (event: Event) => {
    const h = (event.target as HTMLElement | null)?.closest(".cth");
    h?.parentElement?.classList.toggle("collapsed");
  };
  root.addEventListener("click", onClick);

  const cards = [...root.querySelectorAll(".card")] as HTMLElement[];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    cards.forEach(settle);
    return () => root.removeEventListener("click", onClick);
  }

  async function run(card: HTMLElement, delay: number) {
    await sleep(delay);
    const els = [...card.querySelectorAll<HTMLElement>("[data-s]")].sort((a, b) => +(a.dataset.s || 0) - +(b.dataset.s || 0));
    while (!stop) {
      if (stop) return;
      reset(card);
      for (const e of els) {
        if (stop) break;
        await sleep(+(e.dataset.w || 280));
        if (stop) break;
        await go(e, card);
      }
      await sleep(4200);
    }
  }
  cards.forEach((c, i) => void run(c, i * 700));

  return () => {
    stop = true;
    timers.forEach((id) => window.clearTimeout(id));
    root.removeEventListener("click", onClick);
  };
}

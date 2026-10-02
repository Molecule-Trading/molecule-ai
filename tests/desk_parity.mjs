import { spawnSync } from "node:child_process";
import { replay, simulate } from "../apps/web/lib/desk/engine.ts";

const root = "/workspace/artifacts/molecule-ai";
const py = spawnSync("/tmp/molecule-venv/bin/python", ["tests/desk_oracle.py"], {
  cwd: root,
  encoding: "utf8",
});
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}
const cases = JSON.parse(py.stdout);
const tol = 1e-8;
let failed = 0;

function near(a, b) {
  if (a == null && b == null) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
  return a === b;
}

for (const item of cases) {
  const tape = simulate(item.bars, item.spec).tape;
  if (tape.length !== item.tape.length) {
    console.error(item.name, "tape length", tape.length, item.tape.length);
    failed += 1;
    continue;
  }
  tape.forEach((day, i) => {
    const src = item.tape[i];
    for (const key of ["t", "pos", "turn", "opened", "closed", "reason"]) {
      if (day[key] !== src[key]) {
        console.error(item.name, i, key, day[key], src[key]);
        failed += 1;
      }
    }
    for (const key of ["asset", "gross", "px"]) {
      if (!near(day[key], src[key])) {
        console.error(item.name, i, key, day[key], src[key]);
        failed += 1;
      }
    }
    if (JSON.stringify(day.fills) !== JSON.stringify(src.fills)) {
      console.error(item.name, i, "fills", day.fills, src.fills);
      failed += 1;
    }
  });
  for (const [label, fee, slip, expect] of [
    ["zero", 0, 0, item.zero],
    ["cost", 0.1, 0.05, item.cost],
  ]) {
    const metrics = replay(item.tape, fee, slip).metrics;
    for (const key of Object.keys(expect)) {
      if (!near(metrics[key], expect[key])) {
        console.error(item.name, label, key, metrics[key], expect[key]);
        failed += 1;
      }
    }
  }
}

if (failed) {
  console.error(`parity failed: ${failed}`);
  process.exit(1);
}
console.log(`parity ok: ${cases.length} cases`);

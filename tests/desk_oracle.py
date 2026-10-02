"""Print the Python tapes the TypeScript desk must match."""

import json

from engine.desk.report import report
from engine.desk.schema import DeskSpec, EventMark, Rule
from engine.desk.simulate import Bar, simulate


def flat(days: list[str], px: float = 100.0) -> list[Bar]:
    return [Bar(d, px, px, px, px) for d in days]


def add(cases: list[dict], name: str, bars: list[Bar], spec: DeskSpec) -> None:
    tape = simulate(bars, spec)["tape"]
    cases.append(
        {
            "name": name,
            "bars": [{"t": b.t, "o": b.o, "h": b.h, "l": b.l, "c": b.c} for b in bars],
            "spec": spec.model_dump(),
            "tape": tape,
            "zero": report(tape, 0, 0),
            "cost": report(tape, 0.001, 0.0005),
        }
    )


def main() -> None:
    cases: list[dict] = []
    add(
        cases,
        "stop",
        flat(["2020-01-02", "2020-01-03", "2020-01-06"]) + [Bar("2020-01-07", 100, 105, 90, 92)],
        DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], stop_loss=0.05, exit_mode="bracket"),
    )
    add(
        cases,
        "gap",
        flat(["2020-01-02", "2020-01-03", "2020-01-06"]) + [Bar("2020-01-07", 90, 91, 80, 88)],
        DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], stop_loss=0.05, exit_mode="bracket"),
    )
    add(
        cases,
        "both",
        flat(["2020-01-02", "2020-01-03"]) + [Bar("2020-01-06", 100, 110, 90, 100)],
        DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], stop_loss=0.05, take_profit=0.05, exit_mode="bracket"),
    )
    add(
        cases,
        "open",
        flat(["2020-01-02", "2020-01-03"]) + [Bar("2020-01-06", 100, 100, 100, 110), Bar("2020-01-07", 110, 110, 110, 110)],
        DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], exit_mode="bracket"),
    )
    add(
        cases,
        "trail",
        flat(["2020-01-02", "2020-01-03"]) + [Bar("2020-01-06", 100, 120, 100, 120), Bar("2020-01-07", 115, 130, 107, 125)],
        DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], trailing_stop=0.10, exit_mode="bracket"),
    )
    add(
        cases,
        "short",
        flat(["2020-01-02", "2020-01-03", "2020-01-06"]) + [Bar("2020-01-07", 100, 110, 95, 108)],
        DeskSpec(symbol="EURUSD", asset_class="forex", direction="short", entry=[Rule(kind="always", window=1)], stop_loss=0.05, exit_mode="bracket"),
    )
    add(
        cases,
        "short-trail",
        flat(["2020-01-02", "2020-01-03"]) + [Bar("2020-01-06", 100, 100, 80, 80), Bar("2020-01-07", 85, 90, 70, 86)],
        DeskSpec(symbol="TEST", direction="short", entry=[Rule(kind="always", window=1)], trailing_stop=0.10, exit_mode="bracket"),
    )
    add(
        cases,
        "hold",
        flat(["2020-01-02", "2020-01-03", "2020-01-06"]) + [Bar("2020-01-07", 110, 110, 110, 110), Bar("2020-01-08", 50, 50, 50, 50)],
        DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], max_hold_bars=1, exit_mode="bracket"),
    )
    add(
        cases,
        "event",
        flat(["2020-01-08", "2020-01-09", "2020-01-10", "2020-01-13", "2020-01-14"]),
        DeskSpec(
            symbol="SPY",
            entry=[Rule(kind="event_bias", window=1, threshold=1)],
            events=[EventMark(date="2020-01-10", bias=1, note="known release")],
            max_hold_bars=1,
            exit_mode="bracket",
        ),
    )
    add(
        cases,
        "flat",
        flat(["2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07"]),
        DeskSpec(
            symbol="TEST",
            direction="both",
            entry=[Rule(kind="always", window=1)],
            entry_short=[Rule(kind="always", window=1)],
            exit_mode="bracket",
        ),
    )
    print(json.dumps(cases))


if __name__ == "__main__":
    main()

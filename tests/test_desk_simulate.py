"""Hand-checked fills. These numbers are the contract for the TypeScript port."""

import pytest

from engine.desk.parse import normalize_spec
from engine.desk.report import report
from engine.desk.schema import DeskSpec, EventMark, Rule
from engine.desk.simulate import Bar, simulate


def _flat(days: list[str], px: float = 100.0) -> list[Bar]:
    return [Bar(d, px, px, px, px) for d in days]


def _fills(tape: list[dict]) -> list[dict]:
    out = []
    for day in tape:
        for fill in day["fills"]:
            out.append({**fill, "t": day["t"]})
    return out


def test_stop_fills_at_stop_not_at_the_close():
    bars = _flat(["2020-01-02", "2020-01-03", "2020-01-06"])
    bars.append(Bar("2020-01-07", 100, 105, 90, 92))
    spec = DeskSpec(
        symbol="TEST",
        entry=[Rule(kind="always", window=1)],
        stop_loss=0.05,
        exit_mode="bracket",
    )
    tape = simulate(bars, spec)["tape"]
    fills = _fills(tape)
    assert [f["t"] for f in fills] == ["2020-01-06", "2020-01-07"]
    assert fills[0] == {"side": "BUY", "price": 100.0, "reason": "entry", "qty": 1000, "t": "2020-01-06"}
    assert fills[1]["price"] == 95
    assert fills[1]["side"] == "SELL"
    assert fills[1]["reason"] == "stop"
    assert tape[2]["gross"] == pytest.approx(0)
    assert tape[3]["gross"] == pytest.approx(-0.05)
    assert tape[3]["pos"] == 0
    zero = report(tape, 0, 0)
    assert zero["ending_equity"] == 95_000
    assert zero["total_return"] == pytest.approx(-0.05)
    assert zero["trade_count"] == 1
    assert zero["gross_pnl"] == -5_000
    assert zero["net_pnl"] == -5_000
    e = 100_000.0
    e *= 1.0
    e *= 1.0
    e *= 1.0 - 0.0015
    e *= 1.0 - 0.05 - 0.0015
    costed = report(tape, 0.001, 0.0005)
    assert costed["ending_equity"] == e
    assert costed["gross_pnl"] == -5_000
    assert costed["net_pnl"] == e - 100_000
    assert costed["starting_equity"] == 100_000


def test_gap_through_stop_fills_at_the_open():
    bars = _flat(["2020-01-02", "2020-01-03", "2020-01-06"])
    bars.append(Bar("2020-01-07", 90, 91, 80, 88))
    spec = DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], stop_loss=0.05, exit_mode="bracket")
    tape = simulate(bars, spec)["tape"]
    sell = _fills(tape)[-1]
    assert sell["price"] == 90
    assert report(tape, 0, 0)["ending_equity"] == 90_000


def test_stop_wins_when_the_same_bar_also_hits_the_target():
    bars = _flat(["2020-01-02", "2020-01-03"])
    bars.append(Bar("2020-01-06", 100, 110, 90, 100))
    spec = DeskSpec(
        symbol="TEST",
        entry=[Rule(kind="always", window=1)],
        stop_loss=0.05,
        take_profit=0.05,
        exit_mode="bracket",
    )
    tape = simulate(bars, spec)["tape"]
    fills = _fills(tape)
    assert fills[0]["price"] == 100 and fills[0]["side"] == "BUY"
    assert fills[1]["price"] == 95 and fills[1]["reason"] == "stop"
    assert tape[2]["opened"] and tape[2]["closed"]
    assert report(tape, 0, 0)["ending_equity"] == 95_000


def test_entry_is_the_next_open_not_the_signal_close():
    bars = _flat(["2020-01-02", "2020-01-03"])
    bars.append(Bar("2020-01-06", 100, 100, 100, 110))
    bars.append(Bar("2020-01-07", 110, 110, 110, 110))
    spec = DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], exit_mode="bracket")
    tape = simulate(bars, spec)["tape"]
    buy = _fills(tape)[0]
    assert buy["t"] == "2020-01-06"
    assert buy["price"] == 100
    assert buy["qty"] == 1000
    assert tape[2]["gross"] == pytest.approx(0.10)
    assert tape[2]["pos"] == 1
    assert report(tape, 0, 0)["ending_equity"] == pytest.approx(110_000)
    assert report(tape, 0, 0)["open_marked"] is True


def test_trailing_stop_ignores_the_current_bar_extreme():
    bars = _flat(["2020-01-02", "2020-01-03"])
    bars.append(Bar("2020-01-06", 100, 120, 100, 120))
    bars.append(Bar("2020-01-07", 115, 130, 107, 125))
    spec = DeskSpec(
        symbol="TEST",
        entry=[Rule(kind="always", window=1)],
        trailing_stop=0.10,
        exit_mode="bracket",
    )
    tape = simulate(bars, spec)["tape"]
    assert tape[2]["closed"] is False
    assert tape[2]["pos"] == 1
    sell = _fills(tape)[-1]
    assert sell["t"] == "2020-01-07"
    assert sell["price"] == 108
    assert report(tape, 0, 0)["ending_equity"] == 108_000


def test_short_cover_subtracts_cash_and_stops_above_entry():
    bars = _flat(["2020-01-02", "2020-01-03", "2020-01-06"])
    bars.append(Bar("2020-01-07", 100, 110, 95, 108))
    spec = DeskSpec(
        symbol="EURUSD",
        asset_class="forex",
        direction="short",
        entry=[Rule(kind="always", window=1)],
        stop_loss=0.05,
        exit_mode="bracket",
    )
    tape = simulate(bars, spec)["tape"]
    fills = _fills(tape)
    assert fills[0]["side"] == "SELL" and fills[0]["price"] == 100 and fills[0]["qty"] == 1000
    assert fills[1]["side"] == "BUY" and fills[1]["price"] == 105
    assert report(tape, 0, 0)["ending_equity"] == 95_000


def test_short_trail_uses_the_prior_low_only():
    bars = _flat(["2020-01-02", "2020-01-03"])
    bars.append(Bar("2020-01-06", 100, 100, 80, 80))
    bars.append(Bar("2020-01-07", 85, 90, 70, 86))
    spec = DeskSpec(
        symbol="TEST",
        direction="short",
        entry=[Rule(kind="always", window=1)],
        trailing_stop=0.10,
        exit_mode="bracket",
    )
    tape = simulate(bars, spec)["tape"]
    assert tape[2]["closed"] is False
    cover = _fills(tape)[-1]
    assert cover["price"] == 88
    assert report(tape, 0, 0)["ending_equity"] == 112_000


def test_max_hold_exits_the_next_open():
    bars = _flat(["2020-01-02", "2020-01-03", "2020-01-06"])
    bars.append(Bar("2020-01-07", 110, 110, 110, 110))
    bars.append(Bar("2020-01-08", 50, 50, 50, 50))
    spec = DeskSpec(
        symbol="TEST",
        entry=[Rule(kind="always", window=1)],
        max_hold_bars=1,
        exit_mode="bracket",
    )
    tape = simulate(bars, spec)["tape"]
    fills = _fills(tape)
    assert fills[0]["t"] == "2020-01-06" and fills[0]["price"] == 100
    assert fills[1]["t"] == "2020-01-07" and fills[1]["price"] == 110 and fills[1]["reason"] == "time"
    # The entry rule is still true, so the next session is a new trade, not the old one held into the gap.
    assert fills[2]["t"] == "2020-01-08" and fills[2]["side"] == "BUY" and fills[2]["price"] == 50
    assert report(tape, 0, 0)["ending_equity"] == pytest.approx(110_000)


def test_event_does_not_fire_before_its_date():
    bars = _flat(["2020-01-08", "2020-01-09", "2020-01-10", "2020-01-13", "2020-01-14"])
    spec = DeskSpec(
        symbol="SPY",
        entry=[Rule(kind="event_bias", window=1, threshold=1)],
        events=[EventMark(date="2020-01-10", bias=1, note="known release")],
        max_hold_bars=1,
        exit_mode="bracket",
    )
    fills = _fills(simulate(bars, spec)["tape"])
    assert [f["t"] for f in fills] == ["2020-01-13", "2020-01-14"]


def test_both_directions_true_stays_flat():
    bars = _flat(["2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07"])
    spec = DeskSpec(
        symbol="TEST",
        direction="both",
        entry=[Rule(kind="always", window=1)],
        entry_short=[Rule(kind="always", window=1)],
        exit_mode="bracket",
    )
    tape = simulate(bars, spec)["tape"]
    assert _fills(tape) == []
    assert all(day["pos"] == 0 for day in tape)


def test_leftover_cash_is_kept_when_price_does_not_divide():
    bars = [Bar(d, 33, 33, 33, 33) for d in ("2020-01-02", "2020-01-03", "2020-01-06")]
    spec = DeskSpec(symbol="TEST", entry=[Rule(kind="always", window=1)], exit_mode="bracket")
    tape = simulate(bars, spec)["tape"]
    buy = _fills(tape)[0]
    assert buy["qty"] == 3030
    assert buy["price"] == 33
    assert tape[2]["gross"] == 0


def test_short_cross_sells_under_the_average_not_above_it():
    bars = [
        Bar("2020-01-02", 100, 100, 100, 100),
        Bar("2020-01-03", 100, 100, 100, 100),
        Bar("2020-01-06", 100, 100, 90, 90),
        Bar("2020-01-07", 90, 90, 90, 90),
        Bar("2020-01-08", 90, 90, 90, 90),
    ]
    spec = DeskSpec(
        symbol="TEST",
        direction="short",
        entry=[Rule(kind="sma_cross", window=2)],
        exit_mode="bracket",
        max_hold_bars=1,
    )
    spec = normalize_spec(spec)
    assert spec.entry[0].kind == "sma_cross_down"
    fills = _fills(simulate(bars, spec)["tape"])
    assert fills[0]["side"] == "SELL"
    assert fills[0]["t"] == "2020-01-07"
    assert fills[0]["price"] == 90


def test_forex_is_refused_before_any_request():
    from data.alpaca.bars import AlpacaBars, AlpacaError

    with pytest.raises(AlpacaError, match="does not publish forex"):
        AlpacaBars("k", "s").daily("forex", "EUR/USD", "2020-01-01", "2020-06-01")


def test_normalize_reads_a_percent_stop_and_does_not_invent_a_date():
    spec = normalize_spec(
        DeskSpec(
            symbol="AAPL",
            entry=[Rule(kind="sma_cross", window=20)],
            stop_loss=5,
            exit_mode="reverse",
            events=[EventMark(date="not-a-date", bias=1, note="some speech")],
        )
    )
    assert spec.stop_loss == 0.05
    assert spec.exit_mode == "bracket"
    assert spec.events == []
    assert any("speech" in item for item in spec.untested)
    assert "percent" in spec.notes


def test_missing_keys_fail_before_any_network(tmp_path, monkeypatch):
    from apps.api.settings import Settings
    from apps.api.service import ResearchService

    settings = Settings(
        data_dir=str(tmp_path / "data"),
        duckdb_path=str(tmp_path / "m.duckdb"),
        xai_api_key="",
        alpaca_api_key_id="",
        alpaca_api_secret_key="",
    )
    run = ResearchService(settings).start_research("Buy AAPL when it is above its 50 day average and risk 2%.")
    assert run["status"] == "FAILED"
    assert "XAI_API_KEY" in run["error"]
    assert run["results"] is None

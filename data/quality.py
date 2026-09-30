from __future__ import annotations

from dataclasses import dataclass, field

import polars as pl

from engine.schema import EventType, Venue


@dataclass
class DataQualityReport:
    dataset_id: str
    status: str
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    missing_intervals: int = 0
    duplicates: int = 0
    out_of_order: int = 0
    impossible_prices: int = 0
    negative_quantities: int = 0
    crossed_markets: int = 0
    row_count: int = 0

    def compact(self) -> dict:
        return {
            "dataset_id": self.dataset_id,
            "status": self.status,
            "row_count": self.row_count,
            "missing_intervals": self.missing_intervals,
            "duplicates": self.duplicates,
            "out_of_order": self.out_of_order,
            "impossible_prices": self.impossible_prices,
            "negative_quantities": self.negative_quantities,
            "crossed_markets": self.crossed_markets,
            "warnings": self.warnings[:20],
            "errors": self.errors[:20],
        }


def assess_quality(
    frame: pl.DataFrame,
    dataset_id: str,
    venue: Venue,
    timeframe_seconds: int | None = None,
) -> DataQualityReport:
    report = DataQualityReport(dataset_id=dataset_id, status="ok", row_count=frame.height)
    if frame.is_empty():
        report.status = "error"
        report.errors.append("Empty dataset")
        return report

    if "timestamp" not in frame.columns:
        report.status = "error"
        report.errors.append("Missing timestamp column")
        return report

    ts = frame.get_column("timestamp")
    values = ts.to_list()
    ooo = 0
    for a, b in zip(values, values[1:]):
        if a is None or b is None:
            continue
        if b < a:
            ooo += 1
    if ooo:
        report.out_of_order = ooo
        report.warnings.append(f"{report.out_of_order} out-of-order timestamps")

    dup = frame.select(pl.col("timestamp")).is_duplicated().sum()
    # is_duplicated marks all members of a duplicate group
    if "market_id" in frame.columns:
        key_cols = ["timestamp", "market_id"]
        if "event_type" in frame.columns:
            key_cols.append("event_type")
        if "outcome" in frame.columns:
            key_cols.append("outcome")
        report.duplicates = int(frame.select(key_cols).is_duplicated().sum() // 2)
    else:
        report.duplicates = int(dup // 2) if isinstance(dup, int) else int(dup)
    if report.duplicates:
        report.warnings.append(f"{report.duplicates} duplicate keys")

    price_cols = [c for c in ("price", "open", "high", "low", "close", "bid", "ask") if c in frame.columns]
    for col in price_cols:
        bad = frame.filter((pl.col(col).is_not_null()) & (pl.col(col) <= 0)).height
        if bad:
            report.impossible_prices += bad
            report.warnings.append(f"{bad} non-positive values in {col}")

    for col in ("quantity", "volume"):
        if col in frame.columns:
            bad = frame.filter((pl.col(col).is_not_null()) & (pl.col(col) < 0)).height
            if bad:
                report.negative_quantities += bad
                report.warnings.append(f"{bad} negative {col}")

    if "bid" in frame.columns and "ask" in frame.columns:
        crossed = frame.filter(
            pl.col("bid").is_not_null()
            & pl.col("ask").is_not_null()
            & (pl.col("bid") > pl.col("ask"))
        ).height
        if crossed:
            report.crossed_markets = crossed
            report.warnings.append(f"{crossed} crossed bid/ask quotes")

    if timeframe_seconds and frame.height > 2:
        sorted_ts = frame.sort("timestamp").get_column("timestamp")
        gaps = 0
        values = sorted_ts.to_list()
        for a, b in zip(values, values[1:]):
            delta = (b - a).total_seconds()
            if delta > timeframe_seconds * 2.5:
                gaps += 1
        report.missing_intervals = gaps
        if gaps:
            report.warnings.append(f"{gaps} timestamp gaps larger than 2.5x timeframe")

    if venue in (Venue.KALSHI, Venue.POLYMARKET):
        if "event_type" in frame.columns:
            settlements = frame.filter(pl.col("event_type") == EventType.SETTLEMENT.value).height
            if settlements == 0:
                report.warnings.append("No settlement events present; unresolved markets cannot be settled")

    if report.errors:
        report.status = "error"
    elif report.warnings:
        report.status = "warning"
    return report

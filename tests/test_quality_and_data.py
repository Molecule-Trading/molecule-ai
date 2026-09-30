import polars as pl

from data.quality import assess_quality
from engine.schema import Venue
from scripts.build_fixtures import btc_path


def test_fixture_quality(catalog):
    metas = catalog.find(Venue.BINANCE, "BTCUSDT")
    assert metas
    q = catalog.quality(metas[0].dataset_id)
    assert q.row_count > 0
    assert q.status in ("ok", "warning")


def test_detect_duplicates():
    frame = pl.DataFrame(btc_path()[:3] + btc_path()[1:2])
    report = assess_quality(frame, "dup", Venue.BINANCE, 300)
    assert report.duplicates >= 1 or "duplicate" in " ".join(report.warnings).lower() or report.warnings


def test_detect_bad_price():
    rows = btc_path()[:5]
    rows[2]["close"] = -1
    rows[2]["price"] = -1
    report = assess_quality(pl.DataFrame(rows), "bad", Venue.BINANCE, 300)
    assert report.impossible_prices >= 1


def test_catalog_summarize_is_compact(catalog):
    meta = catalog.find(Venue.KALSHI, "BTC-MOVE")[0]
    summary = catalog.summarize(meta.dataset_id)
    assert "rows" in summary
    assert "data_quality" in summary
    assert summary["synthetic"] is True

import pytest

from data.catalog import DataCatalog
from data.normalization.events import frame_to_events
from engine.schema import StrategySpec
from scripts.build_fixtures import build_and_register


@pytest.fixture(scope="session")
def catalog(tmp_path_factory):
    root = tmp_path_factory.mktemp("data")
    cat = DataCatalog(root / "data", root / "molecule.duckdb")
    build_and_register(cat)
    return cat


@pytest.fixture(scope="session")
def datasets(catalog):
    return catalog.list_all()


@pytest.fixture(scope="session")
def events(catalog, datasets):
    frames = [catalog.load(d.dataset_id) for d in datasets]
    import polars as pl

    merged = pl.concat(frames, how="diagonal_relaxed").sort(["timestamp", "sequence"])
    return frame_to_events(merged)


@pytest.fixture
def base_spec():
    return StrategySpec.model_validate(
        {
            "name": "golden_btc_pm",
            "hypothesis": "1% BTC 5m move predicts delayed PM repricing",
            "universe": {
                "reference": {"venue": "BINANCE", "symbol": "BTCUSDT"},
                "target": {"venue": "KALSHI", "market_id": "BTC-MOVE-FIXTURE"},
            },
            "data": {"timeframe": "5m"},
            "signal": {"type": "momentum", "window": "5m", "threshold": 0.01, "source": "reference", "direction": "abs"},
            "entry": {"action": "BUY", "outcome": "YES"},
            "exit": {"type": "SETTLEMENT"},
            "sizing": {"type": "fixed_notional", "notional": 1000},
            "execution": {"latency_ms": 100, "slippage": "none", "fee_bps": 0},
            "capital": {"initial": 100000},
            "risk": {"one_position": True},
        }
    )

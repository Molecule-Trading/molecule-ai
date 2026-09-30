from agents.research.agent import fallback_spec
from agents.tools.catalog import TOOLS
from engine.schema import StrategySpec
from engine.validate import validate_strategy


def test_fallback_spec_is_valid_dsl():
    spec = fallback_spec("btc move vs kalshi fixture")
    assert spec.universe.reference.venue.value == "BINANCE"
    assert spec.universe.target.venue.value == "KALSHI"
    StrategySpec.model_validate(spec.model_dump())


def test_tools_are_explicit_and_finite():
    names = {t["function"]["name"] for t in TOOLS}
    assert "run_backtest" in names
    assert "create_strategy" in names
    assert "validate_strategy" in names
    assert len(names) <= 12


def test_validate_rejects_binance_settlement_exit(base_spec, datasets):
    spec = base_spec.model_copy(deep=True)
    spec.universe.target.venue = spec.universe.reference.venue
    spec.universe.target.symbol = "BTCUSDT"
    spec.universe.target.market_id = "BTCUSDT"
    spec.exit.type = "SETTLEMENT"
    out = validate_strategy(spec, datasets)
    assert not out.valid
    assert any(e.field == "exit" for e in out.errors)


def test_validate_warns_on_synthetic(base_spec, datasets):
    out = validate_strategy(base_spec, datasets)
    assert out.valid
    assert any(w.code == "synthetic" for w in out.warnings)


def test_service_health_and_research(tmp_path, monkeypatch):
    from apps.api.settings import Settings
    from apps.api.service import ResearchService

    settings = Settings(
        data_dir=str(tmp_path / "data"),
        duckdb_path=str(tmp_path / "m.duckdb"),
        xai_api_key="",
    )
    svc = ResearchService(settings)
    run = svc.start_research("Test whether a 1% BTC move over 5 minutes predicts delayed PM repricing.")
    assert run["status"] in ("COMPLETED", "FAILED")
    if run["status"] == "COMPLETED":
        assert run["results"]["analytics"]["trade_count"] >= 1
        assert run["results"]["engine_version"]
        assert "GROK" not in str(run["results"]["analytics"])
        assert run["ai_analysis"]  # fallback explanation, not numbers from the model
        assert any(d.get("synthetic") for d in run["results"]["dataset_versions"])

import pytest
from pydantic import ValidationError

from engine.schema import StrategySpec, Venue


def test_valid_strategy(base_spec):
    assert base_spec.universe.reference.venue == Venue.BINANCE
    assert base_spec.fingerprint()


def test_invalid_instrument():
    with pytest.raises(ValidationError):
        StrategySpec.model_validate(
            {
                "universe": {
                    "reference": {"venue": "BINANCE"},
                    "target": {"venue": "KALSHI", "market_id": "X"},
                },
                "signal": {"type": "momentum"},
            }
        )


def test_schema_rejects_unknown_signal():
    with pytest.raises(ValidationError):
        StrategySpec.model_validate(
            {
                "universe": {
                    "reference": {"venue": "BINANCE", "symbol": "BTCUSDT"},
                    "target": {"venue": "KALSHI", "market_id": "X"},
                },
                "signal": {"type": "magic"},
            }
        )

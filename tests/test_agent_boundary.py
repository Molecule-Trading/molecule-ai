from pydantic import ValidationError

from agents.research.agent import fallback_spec
from engine.schema import StrategySpec


def test_fallback_spec_validates():
    spec = fallback_spec("large BTC moves lead PM prices")
    assert spec.universe.reference.symbol == "BTCUSDT"
    StrategySpec.model_validate(spec.model_dump())


def test_grok_output_cannot_bypass_schema():
    try:
        StrategySpec.model_validate({"signal": {"type": "momentum"}, "python": "print(1)"})
        raised = False
    except ValidationError:
        raised = True
    assert raised

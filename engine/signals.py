from __future__ import annotations

from engine.schema import SignalSpec


def evaluate_signal(
    spec: SignalSpec,
    reference: dict[str, float | None],
    target: dict[str, float | None],
) -> bool:
    src = reference if spec.source == "reference" else target
    if spec.type == "always":
        return True

    if spec.type in ("momentum", "return_threshold"):
        value = src.get("momentum") if spec.type == "momentum" else src.get("return")
        return _threshold(value, spec.threshold, spec.direction)

    if spec.type == "volatility_shock":
        return _threshold(src.get("volatility"), spec.threshold, "up")

    if spec.type == "probability_momentum":
        value = src.get("probability_momentum")
        return _threshold(value, spec.threshold, spec.direction)

    if spec.type == "probability_mean_reversion":
        value = src.get("probability_change")
        if value is None:
            return False
        return abs(value) >= spec.threshold

    if spec.type == "cross_venue_divergence":
        a = reference.get("implied_probability")
        b = target.get("implied_probability")
        if a is None or b is None:
            return False
        return abs(a - b) >= spec.threshold

    if spec.type == "lead_lag":
        value = reference.get("return")
        fired = _threshold(value, spec.threshold, spec.direction)
        return fired

    return False


def _threshold(value: float | None, threshold: float, direction: str) -> bool:
    if value is None:
        return False
    if direction == "up":
        return value >= threshold
    if direction == "down":
        return value <= -threshold
    return abs(value) >= threshold

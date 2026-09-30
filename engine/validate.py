from __future__ import annotations

from engine.schema import (
    DatasetMeta,
    StrategySpec,
    ValidationIssue,
    ValidationResult,
    Venue,
)


def validate_strategy(
    spec: StrategySpec,
    datasets: list[DatasetMeta],
) -> ValidationResult:
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []

    if spec.capital.initial <= 0:
        errors.append(ValidationIssue(field="capital.initial", message="Initial capital must be positive"))

    if spec.execution.latency_ms < 0:
        errors.append(ValidationIssue(field="execution.latency_ms", message="Latency cannot be negative"))

    if spec.execution.fee_bps < 0:
        errors.append(ValidationIssue(field="execution.fee_bps", message="Fees cannot be negative"))

    if spec.signal.lookback_bars < 0:
        errors.append(ValidationIssue(field="signal.lookback_bars", message="Lookback cannot be negative"))

    ref_ok = _has_coverage(spec.universe.reference.venue, spec.universe.reference.identity(), datasets)
    tgt_ok = _has_coverage(spec.universe.target.venue, spec.universe.target.identity(), datasets)

    if not ref_ok:
        errors.append(
            ValidationIssue(
                field="universe.reference",
                message=f"No historical dataset covering {spec.universe.reference.venue.value}:{spec.universe.reference.identity()}",
                code="missing_data",
            )
        )
    if not tgt_ok:
        errors.append(
            ValidationIssue(
                field="universe.target",
                message=f"No historical dataset covering {spec.universe.target.venue.value}:{spec.universe.target.identity()}",
                code="missing_data",
            )
        )

    if spec.data.require_quotes:
        for meta in datasets:
            if meta.timeframe in ("5m", "1m", "15m") and meta.venue == Venue.BINANCE:
                warnings.append(
                    ValidationIssue(
                        field="data.require_quotes",
                        message="Required historical ask data may be unavailable for candle-only Binance series.",
                        code="quotes_unavailable",
                    )
                )
                break

    target_venue = spec.universe.target.venue
    if spec.exit.type == "SETTLEMENT" and target_venue == Venue.BINANCE:
        errors.append(
            ValidationIssue(
                field="exit",
                message="SETTLEMENT exit is only valid for prediction-market targets.",
                code="invalid_exit",
            )
        )

    for meta in datasets:
        if meta.quality_status == "error":
            errors.append(
                ValidationIssue(
                    field="data",
                    message=f"Dataset {meta.dataset_id} failed quality checks.",
                    code="quality",
                )
            )
        elif meta.quality_status == "warning":
            warnings.append(
                ValidationIssue(
                    field="data",
                    message=f"Dataset {meta.dataset_id} has quality warnings: {', '.join(meta.warnings[:3])}",
                    code="quality",
                )
            )
        if meta.synthetic:
            warnings.append(
                ValidationIssue(
                    field="data",
                    message=f"Dataset {meta.dataset_id} is labelled SYNTHETIC/FIXTURE. Do not treat results as live market performance.",
                    code="synthetic",
                )
            )

    return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings)


def _has_coverage(venue: Venue, identity: str, datasets: list[DatasetMeta]) -> bool:
    ident = identity.upper()
    for meta in datasets:
        if meta.venue != venue:
            continue
        inst = meta.instrument.upper()
        if ident in inst or inst in ident or ident.split(":")[0] in inst:
            return True
        if ident.replace("-", "_") in inst.replace("-", "_"):
            return True
    return False

from __future__ import annotations

from engine.schema import Outcome


YES_PAYOUT = 1.0
NO_PAYOUT = 0.0


def settle_binary(outcome_held: Outcome, resolved_winner: Outcome) -> float:
    if resolved_winner not in (Outcome.YES, Outcome.NO):
        raise ValueError("Resolution is unavailable; refusing to infer settlement")
    if outcome_held == resolved_winner:
        return YES_PAYOUT
    return NO_PAYOUT


def settlement_cash(quantity: float, outcome_held: Outcome, resolved_winner: Outcome) -> float:
    return settle_binary(outcome_held, resolved_winner) * quantity


def implied_no(yes_price: float) -> float:
    return 1.0 - yes_price

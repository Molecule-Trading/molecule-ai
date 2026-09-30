from __future__ import annotations

from engine.schema import Outcome


YES_PAYOUT = 1.0
NO_PAYOUT = 0.0


def settle_binary(outcome_held: Outcome, resolved_winner: Outcome) -> float:
    """Binary contract settlement: winning outcome pays $1, loser $0.

    Never infers a winner. Caller must pass a known historical resolution.
    """
    if resolved_winner not in (Outcome.YES, Outcome.NO):
        raise ValueError("Resolution is unavailable; refusing to infer settlement")
    if outcome_held == resolved_winner:
        return YES_PAYOUT
    return NO_PAYOUT


def implied_no(yes_price: float) -> float:
    return 1.0 - yes_price

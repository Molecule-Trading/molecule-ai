from __future__ import annotations

from engine.schema import Outcome


YES_PAYOUT = 1.0
NO_PAYOUT = 0.0


def settle_binary(outcome_held: Outcome, resolved_winner: Outcome) -> float:
    """Unit payout of a held outcome given a known historical winner.

    Never infers a winner. Caller must pass YES or NO.
    """
    if resolved_winner not in (Outcome.YES, Outcome.NO):
        raise ValueError("Resolution is unavailable; refusing to infer settlement")
    if outcome_held == resolved_winner:
        return YES_PAYOUT
    return NO_PAYOUT


def settlement_cash(quantity: float, outcome_held: Outcome, resolved_winner: Outcome) -> float:
    """Cash received at expiry.

    Long +q of the winning outcome receives +q.
    Short −q of the winning outcome pays q (cash = −q).
    Losing outcome pays 0 to the long and nothing extra to the short.
    """
    return settle_binary(outcome_held, resolved_winner) * quantity


def implied_no(yes_price: float) -> float:
    return 1.0 - yes_price

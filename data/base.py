from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

import polars as pl

from engine.schema import Venue


class MarketDataAdapter(ABC):
    venue: Venue

    @abstractmethod
    def list_instruments(self) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def download(
        self,
        instrument: str,
        start: datetime | None = None,
        end: datetime | None = None,
        timeframe: str = "5m",
    ) -> pl.DataFrame:
        raise NotImplementedError

    @abstractmethod
    def normalize(self, raw: pl.DataFrame) -> pl.DataFrame:
        raise NotImplementedError

    def validate(self, frame: pl.DataFrame) -> list[str]:
        issues: list[str] = []
        if frame.is_empty():
            issues.append("empty")
        if "timestamp" not in frame.columns:
            issues.append("missing timestamp")
        return issues

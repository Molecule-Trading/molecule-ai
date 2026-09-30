"""Canonical models and the strategy DSL. Grok produces StrategySpec JSON."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


ENGINE_VERSION = "0.1.0"
SCHEMA_VERSION = "0.1.0"


class Venue(str, Enum):
    BINANCE = "BINANCE"
    KALSHI = "KALSHI"
    POLYMARKET = "POLYMARKET"


class EventType(str, Enum):
    TRADE = "TRADE"
    QUOTE = "QUOTE"
    CANDLE = "CANDLE"
    MARKET_STATE = "MARKET_STATE"
    SETTLEMENT = "SETTLEMENT"


class Side(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class Outcome(str, Enum):
    YES = "YES"
    NO = "NO"
    NA = "NA"


class MarketStatus(str, Enum):
    OPEN = "OPEN"
    TRADING = "TRADING"
    EXPIRED = "EXPIRED"
    RESOLVED = "RESOLVED"
    UNKNOWN = "UNKNOWN"


class SlippageModel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CONSERVATIVE = "conservative"


SLIPPAGE_BPS = {
    SlippageModel.NONE: 0.0,
    SlippageModel.LOW: 2.0,
    SlippageModel.MEDIUM: 8.0,
    SlippageModel.HIGH: 20.0,
    SlippageModel.CONSERVATIVE: 15.0,
}


class MarketEvent(BaseModel):
    timestamp: datetime
    venue: Venue
    market_id: str
    event_type: EventType
    outcome: Outcome = Outcome.NA
    side: Side | None = None
    price: float | None = None
    quantity: float | None = None
    bid: float | None = None
    ask: float | None = None
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: float | None = None
    sequence: int | None = None
    status: MarketStatus | None = None
    expiration: datetime | None = None
    resolution: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("price", "bid", "ask", "open", "high", "low", "close", "quantity", "volume")
    @classmethod
    def finite(cls, v: float | None) -> float | None:
        if v is None:
            return v
        if v != v:
            raise ValueError("NaN is not allowed")
        return v


class DatasetMeta(BaseModel):
    dataset_id: str
    venue: Venue
    instrument: str
    timeframe: str
    start_time: datetime
    end_time: datetime
    source: str
    downloaded_at: datetime
    schema_version: str = SCHEMA_VERSION
    data_version: str
    row_count: int
    checksum: str
    synthetic: bool = False
    quality_status: str = "unknown"
    warnings: list[str] = Field(default_factory=list)


class InstrumentRef(BaseModel):
    venue: Venue
    symbol: str | None = None
    market_id: str | None = None
    ticker: str | None = None
    category: str | None = None
    outcome: Outcome | None = None
    token_id: str | None = None

    @model_validator(mode="after")
    def require_identity(self) -> "InstrumentRef":
        if not any([self.symbol, self.market_id, self.ticker, self.category, self.token_id]):
            raise ValueError("InstrumentRef needs an identity field")
        return self

    def identity(self) -> str:
        return self.market_id or self.ticker or self.symbol or self.token_id or self.category or ""


class UniverseSpec(BaseModel):
    reference: InstrumentRef
    target: InstrumentRef
    filters: dict[str, Any] = Field(default_factory=dict)


class DataSpec(BaseModel):
    start: datetime | None = None
    end: datetime | None = None
    timeframe: str = "5m"
    require_quotes: bool = False
    require_trades: bool = False
    require_settlement: bool = True


class FeatureSpec(BaseModel):
    name: str
    params: dict[str, Any] = Field(default_factory=dict)


class SignalSpec(BaseModel):
    type: Literal[
        "momentum",
        "return_threshold",
        "volatility_shock",
        "probability_momentum",
        "probability_mean_reversion",
        "cross_venue_divergence",
        "lead_lag",
        "always",
    ]
    window: str = "5m"
    threshold: float = 0.01
    lookback_bars: int = 1
    source: Literal["reference", "target"] = "reference"
    compare: Literal["target", "reference"] | None = None
    direction: Literal["up", "down", "abs"] = "abs"
    lag_bars: int = 0


class EntrySpec(BaseModel):
    action: Side = Side.BUY
    outcome: Outcome = Outcome.YES
    on: Literal["signal", "open"] = "signal"


class ExitSpec(BaseModel):
    type: Literal["SETTLEMENT", "SIGNAL_REVERSE", "TIME", "STOP"]
    after: str | None = None
    stop_pct: float | None = None


class SizingSpec(BaseModel):
    type: Literal["fixed_notional", "fixed_contracts", "percent_equity"] = "fixed_notional"
    notional: float = 1000.0
    contracts: float = 100.0
    percent: float = 0.1
    max_position: float | None = None


class RiskSpec(BaseModel):
    max_drawdown_pct: float | None = None
    max_trades: int | None = None
    one_position: bool = True


class ExecutionSpec(BaseModel):
    model: Literal["market", "limit"] = "market"
    latency_ms: int = 100
    slippage: SlippageModel = SlippageModel.CONSERVATIVE
    fee_bps: float = 10.0


class CapitalSpec(BaseModel):
    initial: float = 100_000.0
    currency: str = "USD"


class TimeConstraintSpec(BaseModel):
    trading_start: datetime | None = None
    trading_end: datetime | None = None
    exclude_after_expiry: bool = True


class StrategySpec(BaseModel):
    name: str = "unnamed"
    hypothesis: str = ""
    universe: UniverseSpec
    data: DataSpec = Field(default_factory=DataSpec)
    features: list[FeatureSpec] = Field(default_factory=list)
    signal: SignalSpec
    entry: EntrySpec = Field(default_factory=EntrySpec)
    exit: ExitSpec = Field(default_factory=lambda: ExitSpec(type="SETTLEMENT"))
    sizing: SizingSpec = Field(default_factory=SizingSpec)
    risk: RiskSpec = Field(default_factory=RiskSpec)
    execution: ExecutionSpec = Field(default_factory=ExecutionSpec)
    capital: CapitalSpec = Field(default_factory=CapitalSpec)
    time: TimeConstraintSpec = Field(default_factory=TimeConstraintSpec)
    notes: str = ""

    def fingerprint(self) -> str:
        import hashlib

        payload = self.model_dump_json(exclude={"notes", "hypothesis", "name"})
        return hashlib.sha256(payload.encode()).hexdigest()[:16]


class ValidationIssue(BaseModel):
    field: str
    message: str
    code: str = "invalid"


class ValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationIssue] = Field(default_factory=list)
    warnings: list[ValidationIssue] = Field(default_factory=list)


class TradeRecord(BaseModel):
    trade_id: str
    market_id: str
    venue: Venue
    outcome: Outcome
    side: Side
    quantity: float
    price: float
    fees: float
    slippage: float
    intended_ts: datetime
    fill_ts: datetime
    signal_ts: datetime
    reason: str


class EquityPoint(BaseModel):
    timestamp: datetime
    equity: float
    cash: float
    unrealized: float
    drawdown: float


class AnalyticsReport(BaseModel):
    total_return: float
    net_pnl: float
    sharpe: float | None
    sortino: float | None
    max_drawdown: float
    volatility: float | None
    win_rate: float | None
    profit_factor: float | None
    trade_count: int
    average_trade: float | None
    turnover: float
    initial_capital: float
    ending_equity: float


class ResearchRunStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ResearchStage(str, Enum):
    UNDERSTANDING = "UNDERSTANDING"
    SELECTING_MARKETS = "SELECTING_MARKETS"
    VALIDATING_DATA = "VALIDATING_DATA"
    BUILDING_STRATEGY = "BUILDING_STRATEGY"
    RUNNING_BACKTEST = "RUNNING_BACKTEST"
    CALCULATING_ANALYTICS = "CALCULATING_ANALYTICS"
    INTERPRETING = "INTERPRETING"
    DONE = "DONE"

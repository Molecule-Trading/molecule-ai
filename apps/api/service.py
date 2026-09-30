from __future__ import annotations

from datetime import datetime
from pathlib import Path

import polars as pl

from agents.grok_client import GrokClient
from agents.research.agent import ResearchAgent, fallback_spec
from apps.api.settings import Settings
from apps.api.store import RunStore
from data.binance import BinanceAdapter
from data.catalog import DataCatalog
from data.kalshi import KalshiAdapter
from data.normalization.events import frame_to_events
from data.polymarket import PolymarketAdapter
from engine import ENGINE_VERSION
from engine.analytics.metrics import curve_payload
from engine.backtest.engine import BacktestEngine
from engine.schema import (
    DatasetMeta,
    ResearchRunStatus,
    ResearchStage,
    StrategySpec,
    Venue,
)
from engine.sensitivity import run_sensitivity
from engine.validate import validate_strategy


class ResearchService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.catalog = DataCatalog(settings.data_dir, settings.duckdb_path)
        self.store = RunStore(Path(settings.data_dir).parent / "runs.json")
        self.binance = BinanceAdapter()
        self.kalshi = KalshiAdapter()
        self.polymarket = PolymarketAdapter()
        self.grok = GrokClient(settings.xai_api_key, settings.xai_model, settings.xai_api_base)
        self._ensure_fixtures()

    def _ensure_fixtures(self) -> None:
        if self.catalog.find(Venue.BINANCE, "BTCUSDT") and self.catalog.find(Venue.KALSHI, "BTC-MOVE-FIXTURE"):
            return
        from scripts.build_fixtures import build_and_register

        build_and_register(self.catalog)

    def list_markets(self, venue: str | None = None, query: str | None = None) -> list[dict]:
        out: list[dict] = []
        if venue in (None, "BINANCE"):
            out.extend(self.binance.list_instruments())
        if venue in (None, "KALSHI"):
            ingested = [
                {
                    "venue": m.venue.value,
                    "market_id": m.instrument,
                    "ticker": m.instrument,
                    "title": m.instrument,
                    "period": f"{m.start_time.date()}/{m.end_time.date()}",
                    "rows": m.row_count,
                    "synthetic": m.synthetic,
                    "quality": m.quality_status,
                    "source": "catalog",
                }
                for m in self.catalog.find(Venue.KALSHI, query or "")
            ]
            live = []
            if query:
                try:
                    live = self.kalshi.list_instruments(query=query, limit=8)
                except Exception:
                    live = []
            out.extend(ingested or live)
        if venue in (None, "POLYMARKET"):
            ingested = [
                {
                    "venue": m.venue.value,
                    "market_id": m.instrument,
                    "question": m.instrument,
                    "period": f"{m.start_time.date()}/{m.end_time.date()}",
                    "rows": m.row_count,
                    "synthetic": m.synthetic,
                    "quality": m.quality_status,
                    "source": "catalog",
                }
                for m in self.catalog.find(Venue.POLYMARKET, query or "")
            ]
            live = []
            if query:
                try:
                    live = self.polymarket.list_instruments(query=query, limit=8)
                except Exception:
                    live = []
            out.extend(ingested or live)
        if query and venue == "BINANCE":
            q = query.upper()
            out = [m for m in out if q in str(m.get("symbol") or m.get("market_id") or "")]
        return out

    def datasets(self, venue: str | None = None) -> list[dict]:
        v = Venue(venue) if venue else None
        return [self.catalog.summarize(m.dataset_id) for m in self.catalog.find(v)]

    def inspect(self, venue: str, instrument: str) -> dict:
        metas = self.catalog.find(Venue(venue), instrument)
        if not metas:
            return {"venue": venue, "instrument": instrument, "available": False}
        m = metas[0]
        return {"available": True, **self.catalog.summarize(m.dataset_id)}

    def start_research(self, hypothesis: str) -> dict:
        rec = self.store.create(hypothesis)
        self._execute_run(rec["id"], hypothesis)
        return self.store.get(rec["id"])  # type: ignore

    def _execute_run(self, run_id: str, hypothesis: str) -> None:
        self.store.update(run_id, status=ResearchRunStatus.RUNNING.value)
        self.store.set_stage(run_id, ResearchStage.UNDERSTANDING, "active")
        started = datetime.utcnow()
        ctx: dict[str, Any] = {"spec": None, "validation": None, "result": None, "sensitivity": None}

        def dispatch(name: str, args: dict) -> dict:
            return self._tool(name, args, ctx)

        try:
            self.store.set_stage(run_id, ResearchStage.UNDERSTANDING, "done")
            self.store.set_stage(run_id, ResearchStage.SELECTING_MARKETS, "active")

            analysis = None
            spec: StrategySpec
            if self.grok.enabled:
                agent = ResearchAgent(self.grok, dispatch)

                def on_event(kind: str, payload: dict) -> None:
                    if payload.get("name") == "search_markets":
                        self.store.set_stage(run_id, ResearchStage.SELECTING_MARKETS, "active")
                    if payload.get("name") == "create_strategy":
                        self.store.set_stage(run_id, ResearchStage.BUILDING_STRATEGY, "active")
                    if payload.get("name") == "validate_strategy":
                        self.store.set_stage(run_id, ResearchStage.VALIDATING_DATA, "active")
                    if payload.get("name") == "run_backtest":
                        self.store.set_stage(run_id, ResearchStage.RUNNING_BACKTEST, "active")

                out = agent.run(hypothesis, on_event=on_event)
                analysis = out.get("analysis")
                if out.get("spec"):
                    spec = StrategySpec.model_validate(out["spec"])
                elif ctx.get("spec"):
                    spec = ctx["spec"]
                else:
                    spec = fallback_spec(hypothesis)
                    ctx["spec"] = spec
            else:
                spec = fallback_spec(hypothesis)
                ctx["spec"] = spec
                analysis = (
                    "XAI_API_KEY is not set. Used the deterministic fallback StrategySpec "
                    "for the BTC momentum → Kalshi fixture market hypothesis. "
                    "Numerical results below come from the Python engine, not an LLM."
                )

            self.store.set_stage(run_id, ResearchStage.BUILDING_STRATEGY, "done")
            self.store.update(run_id, strategy_spec=spec.model_dump(mode="json"))

            datasets = self._datasets_for(spec)
            self.store.set_stage(run_id, ResearchStage.VALIDATING_DATA, "active")
            validation = validate_strategy(spec, datasets)
            ctx["validation"] = validation
            self.store.update(run_id, validation=validation.model_dump(), data_sources=[d.dataset_id for d in datasets])
            if not validation.valid:
                self.store.update(
                    run_id,
                    status=ResearchRunStatus.FAILED.value,
                    error="Strategy validation failed",
                    completed_at=datetime.utcnow().isoformat(),
                    ai_analysis=analysis,
                )
                return

            self.store.set_stage(run_id, ResearchStage.VALIDATING_DATA, "done")
            self.store.set_stage(run_id, ResearchStage.RUNNING_BACKTEST, "active")
            events = self._load_events(datasets)
            result = BacktestEngine(spec).run(events, datasets)
            ctx["result"] = result
            self.store.set_stage(run_id, ResearchStage.RUNNING_BACKTEST, "done")
            self.store.set_stage(run_id, ResearchStage.CALCULATING_ANALYTICS, "done")

            if self.grok.enabled and analysis is None:
                analysis = "Backtest completed. See deterministic analytics."

            self.store.set_stage(run_id, ResearchStage.INTERPRETING, "done")
            payload = serialize_result(result, spec)
            elapsed = (datetime.utcnow() - started).total_seconds()
            period = None
            if datasets:
                period = f"{min(d.start_time for d in datasets).date()}/{max(d.end_time for d in datasets).date()}"
            self.store.update(
                run_id,
                status=ResearchRunStatus.COMPLETED.value,
                results=payload,
                ai_analysis=analysis,
                engine_version=ENGINE_VERSION,
                dataset_versions=payload["dataset_versions"],
                data_period=period,
                completed_at=datetime.utcnow().isoformat(),
                runtime=elapsed,
            )
        except Exception as exc:
            self.store.update(
                run_id,
                status=ResearchRunStatus.FAILED.value,
                error=str(exc),
                completed_at=datetime.utcnow().isoformat(),
            )

    def run_spec(self, spec: StrategySpec) -> dict:
        datasets = self._datasets_for(spec)
        validation = validate_strategy(spec, datasets)
        if not validation.valid:
            return {"valid": False, "validation": validation.model_dump()}
        events = self._load_events(datasets)
        result = BacktestEngine(spec).run(events, datasets)
        return {"valid": True, "validation": validation.model_dump(), "results": serialize_result(result, spec)}

    def _tool(self, name: str, args: dict, ctx: dict) -> dict:
        if name == "search_markets":
            return {"ok": True, "markets": self.list_markets(args.get("venue"), args.get("query"))[:12]}
        if name == "inspect_market":
            return {"ok": True, **self.inspect(args["venue"], args["instrument"])}
        if name == "list_datasets":
            return {"ok": True, "datasets": self.datasets(args.get("venue"))}
        if name == "create_strategy":
            try:
                spec = StrategySpec.model_validate(args.get("spec") or args)
                ctx["spec"] = spec
                return {"ok": True, "accepted": True, "spec": spec.model_dump(mode="json"), "fingerprint": spec.fingerprint()}
            except Exception as exc:
                return {"ok": False, "accepted": False, "error": str(exc)}
        if name == "validate_strategy":
            spec = ctx.get("spec")
            if spec is None:
                return {"ok": False, "error": "no strategy"}
            datasets = self._datasets_for(spec)
            val = validate_strategy(spec, datasets)
            ctx["validation"] = val
            return {"ok": True, **val.model_dump()}
        if name == "run_backtest":
            spec = ctx.get("spec")
            if spec is None:
                return {"ok": False, "error": "no strategy"}
            datasets = self._datasets_for(spec)
            val = validate_strategy(spec, datasets)
            if not val.valid:
                return {"ok": False, "validation": val.model_dump()}
            events = self._load_events(datasets)
            result = BacktestEngine(spec).run(events, datasets)
            ctx["result"] = result
            compact = {
                "analytics": result.analytics.model_dump(),
                "assumptions": result.assumptions,
                "trade_count": len(result.trades),
                "warnings": result.warnings[:12],
                "dataset_versions": result.dataset_versions,
                "engine_version": result.engine_version,
            }
            return {"ok": True, **compact}
        if name == "run_sensitivity":
            spec = ctx.get("spec")
            if spec is None:
                return {"ok": False, "error": "no strategy"}
            datasets = self._datasets_for(spec)
            events = self._load_events(datasets)
            grid = {}
            if args.get("windows"):
                grid["window"] = args["windows"]
            if args.get("latencies_ms"):
                grid["latency_ms"] = args["latencies_ms"]
            if args.get("slippages"):
                grid["slippage"] = args["slippages"]
            rows = run_sensitivity(spec, events, datasets, grid or None)
            ctx["sensitivity"] = rows
            return {"ok": True, "rows": rows}
        if name == "get_results":
            result = ctx.get("result")
            if not result:
                return {"ok": False, "error": "no results"}
            return {"ok": True, "analytics": result.analytics.model_dump(), "assumptions": result.assumptions}
        return {"ok": False, "error": f"unknown tool {name}"}

    def _datasets_for(self, spec: StrategySpec) -> list[DatasetMeta]:
        found: list[DatasetMeta] = []
        found.extend(self.catalog.find(spec.universe.reference.venue, spec.universe.reference.identity()))
        found.extend(self.catalog.find(spec.universe.target.venue, spec.universe.target.identity()))
        # unique
        seen = set()
        out = []
        for d in found:
            if d.dataset_id in seen:
                continue
            seen.add(d.dataset_id)
            out.append(d)
        return out

    def _load_events(self, datasets: list[DatasetMeta]):
        frames: list[pl.DataFrame] = []
        for d in datasets:
            frames.append(self.catalog.load(d.dataset_id))
        if not frames:
            return []
        merged = pl.concat(frames, how="diagonal_relaxed").sort(["timestamp", "sequence"])
        return frame_to_events(merged)


def serialize_result(result, spec: StrategySpec) -> dict:
    from engine.analytics.metrics import compact_analytics

    return {
        "analytics": compact_analytics(result.analytics),
        "equity": curve_payload(result.equity_curve),
        "trades": [t.model_dump(mode="json") for t in result.trades],
        "signals": result.signal_series[:200],
        "assumptions": result.assumptions,
        "data_quality": result.data_quality,
        "dataset_versions": result.dataset_versions,
        "engine_version": result.engine_version,
        "feature_version": result.feature_version,
        "warnings": result.warnings,
        "strategy": spec.model_dump(mode="json"),
        "strategy_fingerprint": spec.fingerprint(),
    }


# late import type
from typing import Any

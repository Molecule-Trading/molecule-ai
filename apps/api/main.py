from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from apps.api.service import ResearchService
from apps.api.settings import get_settings
from engine.schema import StrategySpec
from engine import ENGINE_VERSION


settings = get_settings()
service = ResearchService(settings)

app = FastAPI(title="Molecule AI", version=ENGINE_VERSION)
def _cors_origins() -> list[str]:
    raw = [o.strip() for o in settings.web_origin.split(",") if o.strip()]
    if "*" in raw:
        return ["*"]
    for extra in ("http://localhost:3000", "http://127.0.0.1:3000"):
        if extra not in raw:
            raw.append(extra)
    return raw or ["http://localhost:3000"]


_origins = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HypothesisIn(BaseModel):
    hypothesis: str = Field(min_length=8)


class StrategyIn(BaseModel):
    spec: dict


@app.get("/health")
def health():
    return {
        "ok": True,
        "engine_version": ENGINE_VERSION,
        "grok": service.grok.enabled,
        "model": settings.xai_model if service.grok.enabled else None,
    }


@app.get("/markets")
def markets(venue: str | None = None, q: str | None = None):
    return {"markets": service.list_markets(venue, q)}


@app.get("/datasets")
def datasets(venue: str | None = None):
    return {"datasets": service.datasets(venue)}


@app.get("/markets/inspect")
def inspect(venue: str, instrument: str):
    return service.inspect(venue, instrument)


@app.post("/research")
def research(body: HypothesisIn):
    return service.start_research(body.hypothesis)


@app.get("/runs")
def runs():
    return {"runs": service.store.list()}


@app.get("/runs/{run_id}")
def run(run_id: str):
    rec = service.store.get(run_id)
    if not rec:
        raise HTTPException(404, "run not found")
    return rec


@app.post("/validate")
def validate(body: StrategyIn):
    spec = StrategySpec.model_validate(body.spec)
    datasets = service._datasets_for(spec)
    from engine.validate import validate_strategy

    return validate_strategy(spec, datasets).model_dump()


@app.post("/backtest")
def backtest(body: StrategyIn):
    spec = StrategySpec.model_validate(body.spec)
    return service.run_spec(spec)


def run() -> None:
    import uvicorn

    uvicorn.run("apps.api.main:app", host=settings.api_host, port=settings.api_port, reload=True)

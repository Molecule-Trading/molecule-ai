from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime
from pathlib import Path

from engine.schema import ResearchRunStatus, ResearchStage


class RunStore:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._data: dict[str, dict] = {}
        if self.path.exists():
            try:
                self._data = json.loads(self.path.read_text())
            except json.JSONDecodeError:
                self._data = {}

    def _flush(self) -> None:
        self.path.write_text(json.dumps(self._data, indent=2, default=str))

    def create(self, hypothesis: str) -> dict:
        run_id = str(uuid.uuid4())
        rec = {
            "id": run_id,
            "hypothesis": hypothesis,
            "strategy_spec": None,
            "data_sources": [],
            "data_period": None,
            "dataset_versions": [],
            "engine_version": None,
            "status": ResearchRunStatus.QUEUED.value,
            "stage": ResearchStage.UNDERSTANDING.value,
            "stages": _blank_stages(),
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "results": None,
            "ai_analysis": None,
            "runtime": None,
            "error": None,
            "validation": None,
        }
        with self._lock:
            self._data[run_id] = rec
            self._flush()
        return rec

    def update(self, run_id: str, **fields) -> dict:
        with self._lock:
            rec = self._data[run_id]
            rec.update(fields)
            self._flush()
            return rec

    def set_stage(self, run_id: str, stage: ResearchStage, status: str = "done") -> dict:
        with self._lock:
            rec = self._data[run_id]
            rec["stage"] = stage.value
            stages = rec.setdefault("stages", _blank_stages())
            for s in stages:
                if s["key"] == stage.value:
                    s["status"] = status
            # mark earlier stages done
            seen = False
            for s in stages:
                if s["key"] == stage.value:
                    seen = True
                    continue
                if not seen and s["status"] == "pending":
                    s["status"] = "done"
            self._flush()
            return rec

    def get(self, run_id: str) -> dict | None:
        return self._data.get(run_id)

    def list(self) -> list[dict]:
        return sorted(self._data.values(), key=lambda r: r.get("started_at") or "", reverse=True)


def _blank_stages() -> list[dict]:
    labels = [
        (ResearchStage.UNDERSTANDING, "Understanding hypothesis"),
        (ResearchStage.SELECTING_MARKETS, "Selecting markets"),
        (ResearchStage.VALIDATING_DATA, "Validating data"),
        (ResearchStage.BUILDING_STRATEGY, "Building strategy"),
        (ResearchStage.RUNNING_BACKTEST, "Running backtest"),
        (ResearchStage.CALCULATING_ANALYTICS, "Calculating analytics"),
        (ResearchStage.INTERPRETING, "Interpreting results"),
    ]
    return [{"key": s.value, "label": lab, "status": "pending"} for s, lab in labels]

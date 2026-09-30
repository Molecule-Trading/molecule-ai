from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import polars as pl

from data.quality import DataQualityReport, assess_quality
from engine.schema import DatasetMeta, Venue
from engine import ENGINE_VERSION


def parse_timeframe(tf: str) -> int:
    tf = tf.strip().lower()
    if tf.endswith("ms"):
        return max(1, int(tf[:-2]) // 1000)
    unit = tf[-1]
    n = int(tf[:-1])
    return {"s": n, "m": n * 60, "h": n * 3600, "d": n * 86400}[unit]


class DataCatalog:
    def __init__(self, root: str | Path = "./var/data", duckdb_path: str | Path = "./var/molecule.duckdb"):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.duckdb_path = Path(duckdb_path)
        self.duckdb_path.parent.mkdir(parents=True, exist_ok=True)
        self._meta_path = self.root / "catalog.json"
        self._meta: dict[str, dict] = {}
        if self._meta_path.exists():
            self._meta = json.loads(self._meta_path.read_text())

    def _save_meta(self) -> None:
        self._meta_path.write_text(json.dumps(self._meta, indent=2, default=str))

    def dataset_path(self, dataset_id: str) -> Path:
        return self.root / f"{dataset_id}.parquet"

    def checksum_frame(self, frame: pl.DataFrame) -> str:
        raw = frame.write_ipc(None).getvalue() if hasattr(frame, "write_ipc") else frame.write_csv().encode()
        try:
            raw = frame.write_ipc_stream().getvalue()
        except Exception:
            raw = str(frame.hash_rows()).encode()
        return hashlib.sha256(raw).hexdigest()[:16]

    def register(
        self,
        frame: pl.DataFrame,
        venue: Venue,
        instrument: str,
        timeframe: str,
        source: str,
        data_version: str,
        synthetic: bool = False,
    ) -> DatasetMeta:
        if frame.is_empty():
            raise ValueError("Cannot register empty frame")
        ts = frame.get_column("timestamp")
        start = ts.min()
        end = ts.max()
        checksum = hashlib.sha256(
            f"{venue.value}|{instrument}|{timeframe}|{start}|{end}|{frame.height}|{data_version}".encode()
        ).hexdigest()[:16]
        dataset_id = f"{venue.value.lower()}_{instrument.replace('/', '_').replace('-', '_')}_{timeframe}_{checksum}"
        quality = assess_quality(frame, dataset_id, venue, parse_timeframe(timeframe) if timeframe else None)
        meta = DatasetMeta(
            dataset_id=dataset_id,
            venue=venue,
            instrument=instrument,
            timeframe=timeframe,
            start_time=_naive(start),
            end_time=_naive(end),
            source=source,
            downloaded_at=datetime.now(timezone.utc).replace(tzinfo=None),
            data_version=data_version,
            row_count=frame.height,
            checksum=checksum,
            synthetic=synthetic,
            quality_status=quality.status,
            warnings=quality.warnings,
        )
        path = self.dataset_path(dataset_id)
        frame.write_parquet(path)
        self._meta[dataset_id] = meta.model_dump(mode="json")
        self._save_meta()
        self._index_duckdb(path, dataset_id)
        return meta

    def _index_duckdb(self, path: Path, dataset_id: str) -> None:
        con = duckdb.connect(str(self.duckdb_path))
        try:
            con.execute(
                "CREATE TABLE IF NOT EXISTS datasets (dataset_id VARCHAR PRIMARY KEY, path VARCHAR, engine_version VARCHAR)"
            )
            con.execute("DELETE FROM datasets WHERE dataset_id = ?", [dataset_id])
            con.execute(
                "INSERT INTO datasets VALUES (?, ?, ?)",
                [dataset_id, str(path), ENGINE_VERSION],
            )
        finally:
            con.close()

    def get_meta(self, dataset_id: str) -> DatasetMeta | None:
        raw = self._meta.get(dataset_id)
        return DatasetMeta.model_validate(raw) if raw else None

    def load(self, dataset_id: str) -> pl.DataFrame:
        path = self.dataset_path(dataset_id)
        if not path.exists():
            raise FileNotFoundError(dataset_id)
        return pl.read_parquet(path)

    def find(self, venue: Venue | None = None, instrument: str | None = None) -> list[DatasetMeta]:
        out = []
        for raw in self._meta.values():
            meta = DatasetMeta.model_validate(raw)
            if venue and meta.venue != venue:
                continue
            if instrument and instrument.upper() not in meta.instrument.upper() and instrument not in meta.instrument:
                continue
            out.append(meta)
        return sorted(out, key=lambda m: m.instrument)

    def list_all(self) -> list[DatasetMeta]:
        return [DatasetMeta.model_validate(v) for v in self._meta.values()]

    def quality(self, dataset_id: str) -> DataQualityReport:
        frame = self.load(dataset_id)
        meta = self.get_meta(dataset_id)
        venue = meta.venue if meta else Venue.BINANCE
        tf = parse_timeframe(meta.timeframe) if meta and meta.timeframe not in ("tick", "event") else None
        return assess_quality(frame, dataset_id, venue, tf)

    def summarize(self, dataset_id: str) -> dict:
        meta = self.get_meta(dataset_id)
        if not meta:
            return {"error": "unknown dataset"}
        return {
            "dataset_id": meta.dataset_id,
            "venue": meta.venue.value,
            "instrument": meta.instrument,
            "timeframe": meta.timeframe,
            "period": f"{meta.start_time.date()}/{meta.end_time.date()}",
            "rows": meta.row_count,
            "synthetic": meta.synthetic,
            "data_version": meta.data_version,
            "checksum": meta.checksum,
            "data_quality": {
                "status": meta.quality_status,
                "warnings": meta.warnings[:8],
            },
        }


def _naive(value) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)

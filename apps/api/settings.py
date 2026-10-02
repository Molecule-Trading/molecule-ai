from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ROOT / ".env"), extra="ignore")

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    web_origin: str = "http://localhost:3000"
    database_url: str = f"sqlite:///{ROOT / 'var' / 'molecule.db'}"
    redis_url: str = "redis://localhost:6379/0"
    xai_api_key: str = ""
    xai_model: str = "grok-4"
    xai_api_base: str = "https://api.x.ai/v1"
    alpaca_api_key_id: str = ""
    alpaca_api_secret_key: str = ""
    data_dir: str = str(ROOT / "var" / "data")
    duckdb_path: str = str(ROOT / "var" / "molecule.duckdb")


def get_settings() -> Settings:
    return Settings()

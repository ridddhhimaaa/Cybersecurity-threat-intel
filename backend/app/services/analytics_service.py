from functools import lru_cache
from typing import Any

import pandas as pd

from app.config import AGGREGATED_DATA_ROOT
from app.services.cve_service import DataSourceError, sanitize_value


def _read_dataset(path):
    if not path.exists():
        raise DataSourceError(f"Required dataset is missing: {path.name}")
    try:
        return pd.read_parquet(path)
    except Exception as exc:
        raise DataSourceError(f"Could not read dataset: {path.name}") from exc


@lru_cache(maxsize=None)
def get_summary(name: str) -> list[dict[str, Any]]:
    frame = _read_dataset(AGGREGATED_DATA_ROOT / f"{name}.parquet")
    return [
        {key: sanitize_value(value) for key, value in record.items()}
        for record in frame.to_dict(orient="records")
    ]

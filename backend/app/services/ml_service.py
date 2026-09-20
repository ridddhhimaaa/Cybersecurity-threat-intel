from functools import lru_cache
from typing import Any

import pandas as pd

from app.config import FEATURE_DATA_ROOT
from app.services.cve_service import DataSourceError, sanitize_value


@lru_cache(maxsize=None)
def get_ml_output(name: str) -> list[dict[str, Any]]:
    path = FEATURE_DATA_ROOT / f"{name}.parquet"
    if not path.exists():
        raise DataSourceError(f"Required dataset is missing: {path.name}")
    try:
        frame = pd.read_parquet(path)
    except Exception as exc:
        raise DataSourceError(f"Could not read dataset: {path.name}") from exc
    return [
        {key: sanitize_value(value) for key, value in record.items()}
        for record in frame.to_dict(orient="records")
    ]

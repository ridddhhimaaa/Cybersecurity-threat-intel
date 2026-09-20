from functools import lru_cache
from typing import Any

import pandas as pd

from app.config import MAX_LIMIT, PROCESSED_DATA_ROOT


class DataSourceError(RuntimeError):
    """Raised when a required Parquet dataset cannot be read."""


def _read_dataset(path):
    if not path.exists():
        raise DataSourceError(f"Required dataset is missing: {path.name}")
    try:
        return pd.read_parquet(path)
    except Exception as exc:
        raise DataSourceError(f"Could not read dataset: {path.name}") from exc


@lru_cache(maxsize=1)
def get_cves() -> pd.DataFrame:
    return _read_dataset(PROCESSED_DATA_ROOT / "cves_enriched.parquet")


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if hasattr(value, "tolist"):
        value = value.tolist()
    if not isinstance(value, (list, tuple)):
        return [] if pd.isna(value) else [str(value)]
    return [str(item) for item in value if item is not None and not pd.isna(item)]


def sanitize_value(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "tolist"):
        return [sanitize_value(item) for item in value.tolist()]
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [sanitize_value(item) for item in value]
    if pd.isna(value):
        return None
    return value


def _matches_cwe(row: pd.Series, cwe_id: str) -> bool:
    target = cwe_id.strip().upper()
    values = _as_list(row.get("cwe_ids"))
    values.append(row.get("cwe_id"))
    return any(str(value).upper() == target for value in values if pd.notna(value))


def _filtered_cves(
    severity: str | None = None,
    min_cvss: float | None = None,
    max_cvss: float | None = None,
    attack_vector: str | None = None,
    cwe_id: str | None = None,
) -> pd.DataFrame:
    frame = get_cves()
    if severity:
        frame = frame[frame["severity"].fillna("").str.casefold() == severity.casefold()]
    if min_cvss is not None:
        frame = frame[frame["cvss_score"].ge(min_cvss)]
    if max_cvss is not None:
        frame = frame[frame["cvss_score"].le(max_cvss)]
    if attack_vector:
        frame = frame[
            frame["attack_vector"].fillna("").str.casefold() == attack_vector.casefold()
        ]
    if cwe_id:
        frame = frame[frame.apply(_matches_cwe, axis=1, cwe_id=cwe_id)]
    return frame


def _records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    columns = [
        "cve_id", "published", "last_modified", "description", "cvss_score",
        "severity", "attack_vector", "attack_complexity", "privileges_required",
        "user_interaction", "scope", "cwe_id", "cwe_ids", "cwe_count", "cwe_names",
    ]
    records = frame[[column for column in columns if column in frame.columns]].to_dict(orient="records")
    return [{key: sanitize_value(value) for key, value in record.items()} for record in records]


def list_cves(filters: dict[str, Any], limit: int, offset: int) -> tuple[list[dict[str, Any]], int]:
    if limit > MAX_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_LIMIT}")
    frame = _filtered_cves(**filters)
    total = len(frame)
    return _records(frame.iloc[offset : offset + limit]), total


def get_cve(cve_id: str) -> dict[str, Any] | None:
    frame = get_cves()
    matches = frame[frame["cve_id"].fillna("").str.casefold() == cve_id.casefold()]
    records = _records(matches.head(1))
    return records[0] if records else None

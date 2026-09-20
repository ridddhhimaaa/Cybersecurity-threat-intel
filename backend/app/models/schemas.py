from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CVERecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    cve_id: str
    published: datetime | None = None
    last_modified: datetime | None = None
    description: str | None = None
    cvss_score: float | None = None
    severity: str | None = None
    attack_vector: str | None = None
    attack_complexity: str | None = None
    privileges_required: str | None = None
    user_interaction: str | None = None
    scope: str | None = None
    cwe_id: str | None = None
    cwe_ids: list[str] = Field(default_factory=list)
    cwe_count: int | None = None
    cwe_names: list[str] = Field(default_factory=list)


class CVEListResponse(BaseModel):
    data: list[CVERecord]
    count: int
    limit: int
    offset: int


class DataListResponse(BaseModel):
    data: list[dict[str, Any]]
    count: int

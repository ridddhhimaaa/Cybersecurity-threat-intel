# Cybersecurity Threat Intel API

This FastAPI service exposes the existing development Parquet outputs to the future React dashboard. It reads data only; Spark transformations, ML training, authentication, and persistence are outside this service.

## Install and run

From the repository root, activate the existing virtual environment and install the backend dependencies:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

Start the API from the repository root:

```powershell
python -m uvicorn app.main:app --reload --app-dir backend
```

When running from `backend`, use `python -m uvicorn app.main:app --reload` instead. The application resolves `data/` from the repository root, independent of the current working directory.

Interactive documentation is available at `/docs` and `/redoc`.

## Endpoints

- `GET /api/health`
- `GET /api/cves` with `severity`, `min_cvss`, `max_cvss`, `attack_vector`, `cwe_id`, `limit`, and `offset`
- `GET /api/cves/{cve_id}`
- `GET /api/summary/severity`, `/cvss`, `/trends`, `/attack-vectors`, `/attack-complexity`, `/privileges`, `/user-interaction`, `/scope`, `/cwe`, `/top-vulnerabilities`
- `GET /api/ml/features`
- `GET /api/ml/clusters`

List responses use `{ "data": [...], "count": number }`. CVE lists also include `limit` and `offset`.

## Data sources and limitations

The service reads `data/processed/cves_enriched.parquet`, the existing files under `data/aggregated/`, and the existing files under `data/features/`. Datasets are cached in memory after their first request. The current backend operates on the development Parquet dataset and does not provide authentication, a database, or live NVD updates.

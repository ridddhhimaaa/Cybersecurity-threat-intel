from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = PROJECT_ROOT / "data"
PROCESSED_DATA_ROOT = DATA_ROOT / "processed"
AGGREGATED_DATA_ROOT = DATA_ROOT / "aggregated"
FEATURE_DATA_ROOT = DATA_ROOT / "features"

SERVICE_NAME = "cybersecurity-threat-intel-api"
API_PREFIX = "/api"
DEFAULT_LIMIT = 20
MAX_LIMIT = 100

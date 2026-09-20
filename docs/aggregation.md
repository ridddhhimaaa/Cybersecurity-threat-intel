# CVE Aggregation Layer

## Purpose and Input

Step 8 converts the enriched CVE-level dataset into reusable analytical Parquet datasets for Python, ML, FastAPI, React, and Power BI:

`NVD -> Spark normalization -> CWE enrichment -> analytical aggregations`

The job reads `data/processed/cves_enriched.parquet` and never rewrites `cves.parquet`, `cves_enriched.parquet`, or `cwe_summary.parquet`.

## Outputs

The job writes these datasets under `data/aggregated/`:

`severity_summary`, `cvss_summary`, `cvss_version_summary`, `yearly_trends`, `attack_vector_summary`, `attack_complexity_summary`, `privileges_summary`, `user_interaction_summary`, `scope_summary`, `cwe_analytics`, and `top_vulnerabilities`.

`cvss_version_summary` reports the selected normalized metric version using `cvss_version`, `count`, and `percentage_of_total`.

Categorical summaries contain the category, `cve_count`, `average_cvss`, `maximum_cvss`, `minimum_cvss`, and `percentage_of_total`. CVSS summaries contain analytical bands and do not represent an ML prediction. Top vulnerabilities preserve CVE fields and sort by CVSS descending, publication date descending, then CVE ID.

## Metrics and Missing Values

Percentages use `cve_count / input_cve_count * 100`. Counts are not rounded. Null or empty categorical values are represented as `UNKNOWN`. Null CVSS values are placed in the `UNKNOWN` CVSS band and are not fabricated or imputed. Null publication dates remain in `yearly_trends` with a null year and do not disappear.

CVSS bands are deterministic analytical ranges: `LOW` below 4.0, `MEDIUM` from 4.0 to below 7.0, `HIGH` from 7.0 to below 9.0, and `CRITICAL` from 9.0 through 10.0.

## CWE Analytics

`cwe_analytics` is built from the enriched `cwe_ids` relationship array. Only values matching `CWE-<digits>` are counted; `NVD-CWE-Other` and malformed values are excluded. Multiple CWE relationships are preserved and deduplicated per CVE/CWE pair. The existing `data/processed/cwe_summary.parquet` remains an immutable input/reference dataset rather than being overwritten.

## Validation and Limitations

`CVEAggregator` prints input quality metrics, output row counts, checks summary totals and percentage bounds, reloads every output, and confirms the input row count after writing. The current development dataset contains only 20 CVEs, so its statistics are validation examples and must not be interpreted as representative of the full NVD database. The aggregation transformations remain Spark DataFrame operations and are intended to scale with larger inputs.

Run from the `spark` directory:

```powershell
sbt compile
sbt "runMain CVEAggregator"
```
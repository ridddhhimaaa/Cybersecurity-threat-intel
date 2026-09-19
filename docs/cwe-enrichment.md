# CWE Enrichment

## Purpose

Step 7 enriches the normalized CVE dataset with canonical CWE relationships and metadata from MITRE's official CWE XML catalog. This keeps CVE rows available for ML while making CWE-level analysis possible for later aggregation, API, and dashboard stages.

## Input and Outputs

- Input: `data/processed/cves.parquet`
- Enriched CVEs: `data/processed/cves_enriched.parquet`
- CWE summary: `data/processed/cwe_summary.parquet`
- Metadata source: `data/raw/cwe/cwec_latest.xml.zip`

The source `cwe_id` column is preserved unchanged for existing ML compatibility. The enriched dataset adds:

- `cwe_ids`: sorted, uppercase, distinct `array<string>` of recognized values such as `CWE-79`
- `cwe_count`: number of recognized IDs
- `cwe_names`: metadata names aligned with `cwe_ids`
- `cwe_descriptions`: metadata descriptions aligned with `cwe_ids`
- `cwe_name` and `cwe_description`: first aligned metadata value for compatibility with scalar consumers

The summary has one row per CVE-CWE relationship and contains `cwe_id`, `cwe_name`, `cve_count`, `average_cvss`, `maximum_cvss`, `minimum_cvss`, and `high_severity_count`. High severity means the existing `severity` value is `HIGH` or `CRITICAL`; no subjective risk labels are assigned.

## Normalization Rules

CWE IDs are extracted from the existing scalar value using the explicit `CWE-<digits>` pattern, case-insensitively. Values are uppercased, duplicate IDs are removed, and multiple IDs are retained in `cwe_ids`. Nulls, empty strings, missing values, malformed values, and the NVD sentinel `NVD-CWE-Other` produce an empty canonical array. No CWE classification is invented.

MITRE metadata is joined by canonical CWE ID. IDs without a catalog match remain present with null metadata. The job uses a left join so every input CVE remains in the enriched output.

## Validation

Run from the `spark` directory:

```powershell
sbt compile
sbt "runMain CWEEnricher"
```

The job prints input/output counts, classified and unclassified CVEs, distinct CWE and relationship counts, duplicate CVE checks, multiple-CWE counts, and summary row counts. It reloads both output Parquet datasets before completing. The original `cves.parquet` is read-only input and is never overwritten.

Verified on the current development data: 20 input CVEs, 20 enriched CVEs, 1 CVE with a recognized CWE, 19 without, 1 distinct CWE, 1 CVE-CWE relationship, 0 duplicate CVEs, 0 multiple-CWE CVEs, and 1 summary row. The summary contains `CWE-269` with an average, minimum, and maximum CVSS of 8.4 and one high-severity CVE.

## Limitations

The current normalized source contains one scalar `cwe_id`, so multiple classifications can only be preserved when they are present in that source value. Recovering CWE relationships discarded during normalization would require changing the upstream normalizer and is outside this step. MITRE metadata is local and authoritative, but it reflects the catalog ZIP already stored in the repository and is not fetched by the job.

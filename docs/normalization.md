# CVSS Normalization

`CVENormalizer` selects one NVD CVSS metric per CVE in this order: CVSS 3.1, CVSS 3.0, then CVSS 2.0. The selected source is recorded as `cvss_version` with values `3.1`, `3.0`, or `2.0`.

The standardized fields `attack_vector` and `attack_complexity` use the CVSS v3 names when available and the CVSS v2 `accessVector` and `accessComplexity` names for v2 records. CVSS v3 `privileges_required`, `user_interaction`, and `scope` are populated only from v3 metrics.

CVSS v2 semantics are preserved separately as `cvss_v2_authentication`, `cvss_v2_user_interaction_required`, `cvss_v2_obtain_all_privilege`, `cvss_v2_obtain_user_privilege`, and `cvss_v2_obtain_other_privilege`. These fields are not converted into v3 equivalents. In particular, CVSS v2 has no direct `scope` equivalent, so `scope` remains null for v2 records rather than receiving an invented value.

This preserves semantic accuracy: a null means the source metric does not define the standardized field, while a populated v2-specific field retains information that can be analyzed explicitly. CWE enrichment and aggregation preserve the additional columns. Aggregation also produces `cvss_version_summary` without changing the meaning of existing datasets. The existing ML notebook can continue selecting its current features; it imputes only the transformed clustering matrix and does not overwrite exported source values.
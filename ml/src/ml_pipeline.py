from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


FEATURE_COLUMNS = [
    "cvss_score",
    "attack_vector",
    "attack_complexity",
    "privileges_required",
    "user_interaction",
    "scope",
    "cwe_id",
]

NUMERIC_FEATURES = ["cvss_score"]
CATEGORICAL_FEATURES = [
    "attack_vector",
    "attack_complexity",
    "privileges_required",
    "user_interaction",
    "scope",
    "cwe_id",
]


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def build_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median"))]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, NUMERIC_FEATURES),
            ("categorical", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )


def compute_priority_score(df: pd.DataFrame) -> pd.Series:
    """Create a transparent prioritization score without claiming supervised prediction.

    The score intentionally combines normalized CVSS with a small set of documented
    accessibility and privilege assumptions:
      - CVSS contributes the largest share.
      - Network attack paths increase prioritization more than local/physical paths.
      - Lower privilege requirements increase priority.
      - Required user interaction lowers priority relative to zero-click vectors.
      - Scope change increases priority modestly.

    These weights are explicit and easy to revise in one place, but they are not a
    security-standard risk formula.
    """

    cvss_value = df["cvss_score"].fillna(df["cvss_score"].median()) / 10.0

    attack_vector_map = {
        "NETWORK": 1.0,
        "ADJACENT": 0.75,
        "LOCAL": 0.40,
        "PHYSICAL": 0.20,
        np.nan: 0.0,
    }
    privilege_map = {
        "NONE": 0.0,
        "LOW": 0.40,
        "HIGH": 0.80,
        "REQUIRED": 0.40,
        np.nan: 0.0,
    }
    user_interaction_map = {
        "NONE": 0.0,
        "REQUIRED": 0.60,
        np.nan: 0.0,
    }
    scope_map = {
        "UNCHANGED": 0.0,
        "CHANGED": 0.35,
        np.nan: 0.0,
    }

    attack_score = df["attack_vector"].map(attack_vector_map).fillna(0.0)
    privilege_score = df["privileges_required"].map(privilege_map).fillna(0.0)
    user_interaction_score = df["user_interaction"].map(user_interaction_map).fillna(0.0)
    scope_score = df["scope"].map(scope_map).fillna(0.0)

    score = (
        0.55 * cvss_value
        + 0.25 * attack_score
        + 0.10 * privilege_score
        + 0.10 * user_interaction_score
        + 0.05 * scope_score
    )

    return score.clip(lower=0.0, upper=1.0)


def cluster_summary(df: pd.DataFrame) -> pd.DataFrame:
    summary = (
        df.groupby("cluster_id", as_index=False)
        .agg(
            cve_count=("cve_id", "count"),
            average_cvss=("cvss_score", "mean"),
            minimum_cvss=("cvss_score", "min"),
            maximum_cvss=("cvss_score", "max"),
        )
        .sort_values("cluster_id")
        .reset_index(drop=True)
    )

    dominant_cols = [
        "attack_vector",
        "attack_complexity",
        "privileges_required",
        "user_interaction",
        "scope",
        "cwe_id",
    ]

    for col in dominant_cols:
        mode = (
            df.groupby(["cluster_id", col])["cve_id"]
            .count()
            .reset_index()
            .sort_values(["cluster_id", "cve_id"], ascending=[True, False])
            .drop_duplicates(subset="cluster_id")
            .rename(columns={col: f"dominant_{col}", "cve_id": f"dominant_{col}_count"})
        )
        summary = summary.merge(mode[["cluster_id", f"dominant_{col}"]], on="cluster_id", how="left")

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="ML pipeline for clustering CVE data.")
    parser.add_argument("--input", type=str, default="data/processed/cves_enriched.parquet")
    parser.add_argument("--output", type=str, default="data/features/cve_ml_features.parquet")
    parser.add_argument("--summary-output", type=str, default="data/features/cluster_summary.parquet")
    parser.add_argument("--k", type=int, default=3, help="Number of K-Means clusters. Default is 3.")
    args = parser.parse_args()

    project_path = project_root()
    input_path = project_path / args.input
    output_path = project_path / args.output
    summary_output_path = project_path / args.summary_output

    if not input_path.exists():
        raise FileNotFoundError(f"Input dataset not found: {input_path}")

    df = pd.read_parquet(input_path)
    if df.empty:
        raise ValueError("Input parquet dataset is empty.")

    raw_df = df.copy()
    model_df = raw_df[FEATURE_COLUMNS].copy()
    model_df = model_df.replace({"": np.nan, " ": np.nan})

    # Keep cluster configuration small and explicit because the development dataset only has 20 CVEs.
    n_clusters = min(args.k, len(model_df))
    if len(model_df) < 3:
        n_clusters = max(1, len(model_df))

    preprocessor = build_preprocessor()
    feature_matrix = preprocessor.fit_transform(model_df)

    kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    cluster_labels = kmeans.fit_predict(feature_matrix)

    results = raw_df.copy()
    results["cluster_id"] = cluster_labels
    results["ml_priority_score"] = compute_priority_score(results).values

    output_path.parent.mkdir(parents=True, exist_ok=True)
    results.to_parquet(output_path, index=False)

    cluster_results = cluster_summary(results)
    cluster_results.to_parquet(summary_output_path, index=False)

    print(f"Input CVEs: {len(raw_df)}")
    print(f"Feature matrix shape: {feature_matrix.shape}")
    print(f"Clusters created: {len(np.unique(cluster_labels))}")
    print("Cluster counts:")
    print(results["cluster_id"].value_counts().sort_index())
    print("\nCluster CVSS stats:")
    print(cluster_results[["cluster_id", "cve_count", "average_cvss", "minimum_cvss", "maximum_cvss"]].to_string(index=False))
    print("\nSample results:")
    print(
        results[["cve_id", "cvss_score", "severity", "cwe_id", "cluster_id", "ml_priority_score"]]
        .head(10)
        .to_string(index=False)
    )

    # Validation checks required for the ML step.
    assert len(results) == len(raw_df), "Output row count does not match input row count."
    assert results["cve_id"].is_unique, "Duplicate CVE IDs found in output."
    assert results["cluster_id"].notna().all(), "Every CVE must have a cluster assignment."
    assert results["ml_priority_score"].between(0, 1).all(), "ml_priority_score must be in the range [0, 1]."
    assert np.isfinite(results["ml_priority_score"]).all(), "ml_priority_score contains non-finite values."

    reloaded = pd.read_parquet(output_path)
    cluster_reload = pd.read_parquet(summary_output_path)
    assert len(reloaded) == len(raw_df), "Reloaded output row count differs from input count."
    assert len(cluster_reload) == len(cluster_results), "Reloaded cluster summary length mismatch."

    print("\nValidation checks passed.")
    print(f"ml_priority_score range: [{results['ml_priority_score'].min():.3f}, {results['ml_priority_score'].max():.3f}]")
    print(f"Cluster summary rows: {len(cluster_results)}")


if __name__ == "__main__":
    main()

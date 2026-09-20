import java.nio.file.{Files, Path, Paths}

import org.apache.spark.sql.{DataFrame, SparkSession}
import org.apache.spark.sql.functions._

/** Builds reusable analytical Parquet datasets from the enriched CVE records. */
object CVEAggregator {
  private val RequiredColumns = Seq(
    "cve_id", "published", "description", "cvss_version", "cvss_score", "severity", "attack_vector",
    "attack_complexity", "privileges_required", "user_interaction", "scope", "cwe_id",
    "cwe_ids", "cwe_names"
  )

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("CVE Aggregator")
      .master("local[*]")
      .config("spark.hadoop.fs.file.impl", classOf[WindowsSafeLocalFileSystem].getName)
      .getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    try {
      val projectRoot = resolveProjectRoot()
      val inputPath = projectRoot.resolve("data").resolve("processed").resolve("cves_enriched.parquet")
      val outputDirectory = projectRoot.resolve("data").resolve("aggregated")
      require(Files.isDirectory(inputPath), s"Enriched CVE Parquet directory not found: $inputPath")
      Files.createDirectories(outputDirectory)

      val input = spark.read.parquet(inputPath.toUri.toString).cache()
      validateSchema(input)
      val inputCount = input.count()
      val distinctCves = input.select("cve_id").distinct().count()
      val duplicateCves = input.groupBy("cve_id").count().filter(col("count") > 1).count()
      val nullCvss = input.filter(col("cvss_score").isNull).count()
      val nullSeverity = input.filter(col("severity").isNull).count()
      val dateBounds = input.agg(min("published").as("earliest"), max("published").as("latest")).first()

      val severitySummary = categoricalSummary(input, "severity", inputCount)
      val cvssSummary = buildCvssSummary(input, inputCount)
      val cvssVersionSummary = categoricalCountSummary(input, "cvss_version", inputCount)
      val yearlyTrends = input
        .withColumn("year", year(col("published")))
        .withColumn("year_label", when(col("year").isNull, lit("UNKNOWN")).otherwise(col("year").cast("string")))
        .groupBy("year", "year_label")
        .agg(
          count(lit(1)).as("cve_count"),
          avg("cvss_score").as("average_cvss"),
          max("cvss_score").as("maximum_cvss"),
          sum(when(upper(trim(col("severity"))).isin("HIGH", "CRITICAL"), 1).otherwise(0)).cast("long").as("high_severity_count")
        )
        .select("year", "cve_count", "average_cvss", "maximum_cvss", "high_severity_count")
        .orderBy(col("year").asc_nulls_first)

      val attackVectorSummary = categoricalSummary(input, "attack_vector", inputCount)
      val attackComplexitySummary = categoricalSummary(input, "attack_complexity", inputCount)
      val privilegesSummary = categoricalSummary(input, "privileges_required", inputCount)
      val userInteractionSummary = categoricalSummary(input, "user_interaction", inputCount)
      val scopeSummary = categoricalSummary(input, "scope", inputCount)
      val cweAnalytics = buildCweAnalytics(input, inputCount)
      val topVulnerabilities = input
        .select(
          "cve_id", "published", "description", "cvss_score", "severity", "attack_vector",
          "attack_complexity", "privileges_required", "user_interaction", "scope", "cwe_id", "cwe_name"
        )
        .orderBy(col("cvss_score").desc_nulls_last, col("published").desc_nulls_last, col("cve_id").asc)

      val outputs = Seq(
        "severity_summary" -> severitySummary,
        "cvss_summary" -> cvssSummary,
        "cvss_version_summary" -> cvssVersionSummary,
        "yearly_trends" -> yearlyTrends,
        "attack_vector_summary" -> attackVectorSummary,
        "attack_complexity_summary" -> attackComplexitySummary,
        "privileges_summary" -> privilegesSummary,
        "user_interaction_summary" -> userInteractionSummary,
        "scope_summary" -> scopeSummary,
        "cwe_analytics" -> cweAnalytics,
        "top_vulnerabilities" -> topVulnerabilities
      )

      outputs.foreach { case (name, dataFrame) =>
        dataFrame.write.mode("overwrite").parquet(outputDirectory.resolve(name + ".parquet").toUri.toString)
      }

      println(s"Project root: $projectRoot")
      println(s"Input CVE count: $inputCount")
      println(s"Distinct CVE count: $distinctCves")
      println(s"Duplicate CVE count: $duplicateCves")
      println(s"Null CVSS count: $nullCvss")
      println(s"Null severity count: $nullSeverity")
      println(s"Earliest publication date: ${dateBounds.get(0)}")
      println(s"Latest publication date: ${dateBounds.get(1)}")

      outputs.foreach { case (name, _) =>
        val outputPath = outputDirectory.resolve(name + ".parquet")
        require(Files.isDirectory(outputPath), s"Aggregation output was not created: $outputPath")
        val persisted = spark.read.parquet(outputPath.toUri.toString)
        val rowCount = persisted.count()
        println(s"$name rows: $rowCount")
        validateOutput(name, persisted, inputCount)
      }

      val reloadedInputCount = spark.read.parquet(inputPath.toUri.toString).count()
      require(reloadedInputCount == inputCount, s"Input changed during aggregation: before=$inputCount, after=$reloadedInputCount")
      println("All aggregation datasets were written and reloaded successfully.")
      input.unpersist()
    } finally {
      spark.stop()
    }
  }

  private def categoricalSummary(input: DataFrame, columnName: String, total: Long): DataFrame = {
    val category = when(col(columnName).isNull || length(trim(col(columnName).cast("string"))) === 0, lit("UNKNOWN"))
      .otherwise(col(columnName).cast("string"))
    input
      .withColumn("category", category)
      .groupBy("category")
      .agg(
        count(lit(1)).as("cve_count"),
        avg("cvss_score").as("average_cvss"),
        max("cvss_score").as("maximum_cvss"),
        min("cvss_score").as("minimum_cvss")
      )
      .withColumn("percentage_of_total", col("cve_count") / lit(total.toDouble) * 100.0)
      .withColumnRenamed("category", columnName)
      .orderBy(col(columnName).asc)
  }

  private def buildCvssSummary(input: DataFrame, total: Long): DataFrame = {
    val band = when(col("cvss_score").isNull, lit("UNKNOWN"))
      .when(col("cvss_score") < 4.0, lit("LOW"))
      .when(col("cvss_score") < 7.0, lit("MEDIUM"))
      .when(col("cvss_score") < 9.0, lit("HIGH"))
      .otherwise(lit("CRITICAL"))
    input
      .withColumn("cvss_band", band)
      .groupBy("cvss_band")
      .agg(count(lit(1)).as("cve_count"), avg("cvss_score").as("average_cvss"))
      .withColumn("percentage_of_total", col("cve_count") / lit(total.toDouble) * 100.0)
      .withColumn("band_order", when(col("cvss_band") === "LOW", 1).when(col("cvss_band") === "MEDIUM", 2)
        .when(col("cvss_band") === "HIGH", 3).when(col("cvss_band") === "CRITICAL", 4).otherwise(5))
      .orderBy(col("band_order").asc)
      .drop("band_order")
  }

  private def buildCweAnalytics(input: DataFrame, total: Long): DataFrame = {
    val relationships = input
      .select("cve_id", "cvss_score", "severity", "cwe_ids", "cwe_names")
      .selectExpr("cve_id", "cvss_score", "severity", "posexplode(cwe_ids) as (cwe_index, cwe_id)", "cwe_names")
      .withColumn("cwe_name", element_at(col("cwe_names"), col("cwe_index") + 1))
      .filter(col("cwe_id").rlike("^CWE-[0-9]+$"))
      .dropDuplicates("cve_id", "cwe_id")

    relationships
      .groupBy("cwe_id", "cwe_name")
      .agg(
        countDistinct("cve_id").as("cve_count"),
        avg("cvss_score").as("average_cvss"),
        max("cvss_score").as("maximum_cvss"),
        sum(when(upper(trim(col("severity"))).isin("HIGH", "CRITICAL"), 1).otherwise(0)).cast("long").as("high_severity_count")
      )
      .withColumn("percentage_of_total", col("cve_count") / lit(total.toDouble) * 100.0)
      .orderBy(col("cve_count").desc, col("cwe_id").asc)
  }

  private def validateOutput(name: String, output: DataFrame, inputCount: Long): Unit = {
    val countSum = if (output.columns.contains("cve_count")) output.agg(sum("cve_count")).first().getLong(0) else inputCount
    val countBearing = Set("severity_summary", "cvss_summary", "cvss_version_summary", "attack_vector_summary", "attack_complexity_summary",
      "privileges_summary", "user_interaction_summary", "scope_summary", "cwe_analytics")
    if (countBearing.contains(name)) {
      require(countSum <= inputCount, s"$name count total exceeds input: $countSum > $inputCount")
      if (name != "cwe_analytics") require(countSum == inputCount, s"$name does not reconcile: $countSum != $inputCount")
    }
    if (output.columns.contains("percentage_of_total")) {
      require(output.filter(col("percentage_of_total") < 0 || col("percentage_of_total") > 100).count() == 0,
        s"$name contains invalid percentages")
    }
  }

  private def categoricalCountSummary(input: DataFrame, columnName: String, total: Long): DataFrame = {
    input
      .groupBy(columnName)
      .agg(count(lit(1)).as("count"))
      .withColumn("percentage_of_total", col("count") / lit(total.toDouble) * 100.0)
      .orderBy(col(columnName).asc_nulls_first)
  }

  private def validateSchema(input: DataFrame): Unit = {
    val missing = RequiredColumns.filterNot(input.columns.contains)
    require(missing.isEmpty, s"cves_enriched.parquet is missing columns: ${missing.mkString(", ")}")
  }

  private def resolveProjectRoot(): Path = {
    val workingDirectory = Paths.get("").toAbsolutePath.normalize()
    val candidates = Seq(workingDirectory) ++ Option(workingDirectory.getParent).toSeq
    candidates.find(candidate => Files.isDirectory(candidate.resolve("spark")) && Files.isDirectory(candidate.resolve("data")))
      .getOrElse(throw new IllegalStateException(s"Could not locate project root from: $workingDirectory"))
  }
}
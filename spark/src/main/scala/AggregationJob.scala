import java.nio.file.{Files, Path, Paths}

import org.apache.spark.sql.{DataFrame, SparkSession}
import org.apache.spark.sql.functions._

object AggregationJob {

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("CVE Aggregations")
      .master("local[*]")
      .config("spark.hadoop.fs.file.impl", classOf[WindowsSafeLocalFileSystem].getName)
      .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    try {
      val projectRoot = resolveProjectRoot()
      val inputPath = projectRoot.resolve("data").resolve("processed").resolve("cves_enriched.parquet")
      val outputDirectory = projectRoot.resolve("data").resolve("processed").resolve("aggregations")

      require(Files.isDirectory(inputPath), s"Enriched CVE Parquet directory not found: $inputPath")
      Files.createDirectories(outputDirectory)

      val inputCves = spark.read.parquet(inputPath.toUri.toString).cache()
      val inputCount = inputCves.count()

      val severitySummary = inputCves
        .groupBy("severity")
        .count()
        .orderBy(col("severity").asc_nulls_first)

      val cweSummary = inputCves
        .groupBy("cwe_id", "cwe_name")
        .count()
        .orderBy(col("cwe_id").asc_nulls_first, col("cwe_name").asc_nulls_first)

      val yearlySummary = inputCves
        .withColumn("year", year(col("published")))
        .groupBy("year")
        .count()
        .orderBy(col("year").asc_nulls_first)

      val attackVectorSummary = inputCves
        .groupBy("attack_vector")
        .count()
        .orderBy(col("attack_vector").asc_nulls_first)

      val cvssSummary = inputCves
        .where(col("cvss_score").isNotNull)
        .agg(
          avg(col("cvss_score")).as("average_cvss"),
          min(col("cvss_score")).as("minimum_cvss"),
          max(col("cvss_score")).as("maximum_cvss"),
          count(col("cvss_score")).as("cvss_count")
        )

      val privilegesSummary = inputCves
        .groupBy("privileges_required")
        .count()
        .orderBy(col("privileges_required").asc_nulls_first)

      val outputs = Seq(
        "severity_summary" -> severitySummary,
        "cwe_summary" -> cweSummary,
        "yearly_summary" -> yearlySummary,
        "attack_vector_summary" -> attackVectorSummary,
        "cvss_summary" -> cvssSummary,
        "privileges_summary" -> privilegesSummary
      )

      outputs.foreach { case (name, dataFrame) =>
        dataFrame.write.mode("overwrite").parquet(outputDirectory.resolve(name + ".parquet").toUri.toString)
      }

      println(s"Project root: $projectRoot")
      println(s"Input CVEs: $inputCount")
      outputs.foreach { case (name, _) =>
        val outputPath = outputDirectory.resolve(name + ".parquet")
        require(Files.isDirectory(outputPath), s"Aggregation output was not created: $outputPath")

        val persisted = spark.read.parquet(outputPath.toUri.toString)
        println(s"\n$name schema:")
        persisted.printSchema()
        println(s"$name results:")
        persisted.show(20, truncate = false)
        validateOutput(name, persisted, inputCount)
      }

      val inputReloaded = spark.read.parquet(inputPath.toUri.toString)
      val reloadedInputCount = inputReloaded.count()
      println(s"Input CVEs after aggregation: $reloadedInputCount")
      require(
        reloadedInputCount == inputCount,
        s"Input validation failed: before=$inputCount, after=$reloadedInputCount"
      )

      println("All six aggregation Parquet outputs were created and reloaded successfully.")
      inputCves.unpersist()
    } finally {
      spark.stop()
    }
  }

  private def validateOutput(name: String, output: DataFrame, inputCount: Long): Unit = {
    val outputCount = output.count()
    val countSum = if (output.columns.contains("count")) {
      output.agg(sum(col("count"))).first().get(0) match {
        case null => 0L
        case value: Number => value.longValue()
      }
    } else {
      output.select("cvss_count").first().getLong(0)
    }

    require(countSum <= inputCount, s"$name counts exceed input CVEs: $countSum > $inputCount")

    val groupingColumns = name match {
      case "severity_summary" => Seq("severity")
      case "cwe_summary" => Seq("cwe_id", "cwe_name")
      case "yearly_summary" => Seq("year")
      case "attack_vector_summary" => Seq("attack_vector")
      case "privileges_summary" => Seq("privileges_required")
      case "cvss_summary" => Seq.empty[String]
      case _ => throw new IllegalArgumentException(s"Unexpected aggregation: $name")
    }

    if (groupingColumns.nonEmpty) {
      val duplicateGroups = output
        .groupBy(groupingColumns.map(col): _*)
        .count()
        .filter(col("count") > 1)
        .count()
      require(duplicateGroups == 0, s"$name contains duplicate grouping keys: $duplicateGroups")
      println(s"$name groups: $outputCount")
    }
  }

  private def resolveProjectRoot(): Path = {
    val workingDirectory = Paths.get("").toAbsolutePath.normalize()
    val candidates = Seq(workingDirectory) ++ Option(workingDirectory.getParent).toSeq

    candidates.find { candidate =>
      Files.isDirectory(candidate.resolve("spark")) && Files.isDirectory(candidate.resolve("data"))
    }.getOrElse {
      throw new IllegalStateException(
        s"Could not locate the project root from working directory: $workingDirectory"
      )
    }
  }
}
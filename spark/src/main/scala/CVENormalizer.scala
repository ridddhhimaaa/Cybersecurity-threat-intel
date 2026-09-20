import java.io.FileNotFoundException
import java.nio.file.{Files, Path, Paths}

import scala.collection.JavaConverters._

import org.apache.spark.sql.{Column, DataFrame, SparkSession}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types.StructType
import org.apache.hadoop.fs.{FileStatus, Path => HadoopPath, RawLocalFileSystem}
import org.apache.hadoop.fs.permission.FsPermission

/**
  * Normalizes locally downloaded NVD API pages into one CVE record per row and
  * writes the clean result to Parquet. This is intentionally limited to data
  * already present in the NVD JSON; CWE enrichment and feature engineering are
  * separate later pipeline steps.
  */
object CVENormalizer {

  private val CvssVersions = Seq("cvssMetricV31", "cvssMetricV30", "cvssMetricV2")

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("CVE Normalizer")
      .master("local[*]")
      // This local adapter avoids Hadoop's optional winutils.exe permission
      // check while running the local development pipeline on Windows.
      .config("spark.hadoop.fs.file.impl", classOf[WindowsSafeLocalFileSystem].getName)
      .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    try {
      // Paths are resolved relative to the spark directory, so `sbt runMain`
      // works regardless of the machine's absolute workspace location.
      val rawInputDir = Paths.get("..", "data", "raw", "nvd").toAbsolutePath.normalize()
      val parquetOutputDir = Paths.get("..", "data", "processed", "cves.parquet").toAbsolutePath.normalize()
      val inputFileCount = countJsonFiles(rawInputDir)

      require(inputFileCount > 0, s"No NVD JSON files found in: $rawInputDir")

      println(s"Input file count: $inputFileCount")
      // Windows Paths cannot contain `*`, so add the glob after converting the
      // safely resolved input directory to the file URI Spark understands.
      val rawInputGlob = s"${rawInputDir.toUri.toString.stripSuffix("/")}/*.json"
      val rawNvd = spark.read
        .option("multiLine", "true")
        .json(rawInputGlob)

      val normalized = normalize(rawNvd).cache()
      val normalizedCount = normalized.count()

      println(s"Total normalized records: $normalizedCount")
      println("Normalized schema:")
      normalized.printSchema()
      println("First 20 normalized records:")
      normalized.show(20, truncate = false)

      // Initial development output deliberately overwrites prior local output.
      normalized.write.mode("overwrite").parquet(parquetOutputDir.toUri.toString)
      println(s"Parquet written to: $parquetOutputDir")

      // Read the produced Parquet back in the same job to verify it is usable.
      val parquetRoundTrip = spark.read.parquet(parquetOutputDir.toUri.toString)
      val parquetRecordCount = parquetRoundTrip.count()
      println(s"Final Parquet record count: $parquetRecordCount")

      require(
        parquetRecordCount == normalizedCount,
        s"Parquet validation failed: normalized=$normalizedCount, parquet=$parquetRecordCount"
      )

      normalized.unpersist()
    } finally {
      spark.stop()
    }
  }

  /** Explodes the NVD vulnerabilities array and selects one clean row per CVE. */
  private def normalize(rawNvd: DataFrame): DataFrame = {
    val exploded = rawNvd
      // Each source file has one top-level array; explode turns every CVE into a row.
      .select(explode_outer(col("vulnerabilities")).as("vulnerability"))
      .select(col("vulnerability.cve").as("cve"))
      .filter(col("cve").isNotNull)

    val cveSchema = exploded.schema("cve").dataType.asInstanceOf[StructType]

    exploded
      .select(
        optionalColumn(cveSchema, Seq("id"), "cve").cast("string").as("cve_id"),
        optionalColumn(cveSchema, Seq("published"), "cve").cast("timestamp").as("published"),
        optionalColumn(cveSchema, Seq("lastModified"), "cve").cast("timestamp").as("last_modified"),
        englishDescription(cveSchema).as("description"),
        cvssVersion(cveSchema).as("cvss_version"),
        cvssField(cveSchema, Seq("cvssData", "baseScore")).cast("double").as("cvss_score"),
        cvssSeverity(cveSchema).as("severity"),
        cvssField(cveSchema, Seq("cvssData", "attackVector"), Seq("cvssData", "accessVector")).as("attack_vector"),
        cvssField(cveSchema, Seq("cvssData", "attackComplexity"), Seq("cvssData", "accessComplexity")).as("attack_complexity"),
        cvssField(cveSchema, Seq("cvssData", "privilegesRequired")).as("privileges_required"),
        cvssField(cveSchema, Seq("cvssData", "userInteraction")).as("user_interaction"),
        cvssField(cveSchema, Seq("cvssData", "scope")).as("scope"),
        cvssMetricField(cveSchema, "cvssMetricV2", Seq("cvssData", "authentication")).as("cvss_v2_authentication"),
        cvssMetricField(cveSchema, "cvssMetricV2", Seq("userInteractionRequired")).cast("boolean").as("cvss_v2_user_interaction_required"),
        cvssMetricField(cveSchema, "cvssMetricV2", Seq("obtainAllPrivilege")).cast("boolean").as("cvss_v2_obtain_all_privilege"),
        cvssMetricField(cveSchema, "cvssMetricV2", Seq("obtainUserPrivilege")).cast("boolean").as("cvss_v2_obtain_user_privilege"),
        cvssMetricField(cveSchema, "cvssMetricV2", Seq("obtainOtherPrivilege")).cast("boolean").as("cvss_v2_obtain_other_privilege"),
        cweId(cveSchema).as("cwe_id")
      )
      .filter(col("cve_id").isNotNull)
      .dropDuplicates("cve_id")
  }

  /** Returns an English NVD description, or null when descriptions are absent. */
  private def englishDescription(cveSchema: StructType): Column = {
    if (hasField(cveSchema, Seq("descriptions"))) {
      element_at(
        filter(col("cve.descriptions"), description => description.getField("lang") === lit("en")),
        1
      ).getField("value")
    } else {
      lit(null).cast("string")
    }
  }

  /**
    * Chooses the first available value from CVSS v3.1, then v3.0, then v2.
    * This avoids assuming every NVD record has the newer v3.1 metric.
    */
  private def cvssField(cveSchema: StructType, candidatePaths: Seq[String]*): Column = {
    val candidates = for {
      version <- CvssVersions
      path <- candidatePaths
      completePath = Seq("metrics", version) ++ path
      if hasField(cveSchema, completePath)
    } yield element_at(col(s"cve.${completePath.mkString(".")}"), 1)

    coalesceOrNull(candidates)
  }

  /** Identifies the metric version supplying the normalized CVSS values. */
  private def cvssVersion(cveSchema: StructType): Column = {
    val candidates = CvssVersions.flatMap { version =>
      if (hasField(cveSchema, Seq("metrics", version))) {
        Some(when(size(col(s"cve.metrics.$version")) > 0, lit(version match {
          case "cvssMetricV31" => "3.1"
          case "cvssMetricV30" => "3.0"
          case "cvssMetricV2" => "2.0"
        })))
      } else None
    }
    coalesceOrNull(candidates)
  }

  /** Reads a field from one metric version without substituting another version's semantics. */
  private def cvssMetricField(cveSchema: StructType, metricVersion: String, path: Seq[String]): Column = {
    val completePath = Seq("metrics", metricVersion) ++ path
    if (hasField(cveSchema, completePath)) {
      when(
        cvssVersion(cveSchema) === lit("2.0"),
        element_at(col(s"cve.${completePath.mkString(".")}"), 1)
      )
    } else {
      lit(null).cast("string")
    }
  }

  /** v3 severity is within cvssData; v2 commonly stores it at the metric level. */
  private def cvssSeverity(cveSchema: StructType): Column = {
    cvssField(cveSchema, Seq("cvssData", "baseSeverity"), Seq("baseSeverity"))
  }

  /**
    * Extracts the first explicit CWE value already supplied by NVD. Weaknesses
    * and their description arrays are optional, so absent structures return null.
    */
  private def cweId(cveSchema: StructType): Column = {
    if (hasField(cveSchema, Seq("weaknesses", "description", "value"))) {
      val englishWeaknesses = transform(
        col("cve.weaknesses"),
        weakness => element_at(
          filter(weakness.getField("description"), description => description.getField("lang") === lit("en")),
          1
        ).getField("value")
      )
      val availableWeaknesses = filter(englishWeaknesses, value => value.isNotNull)
      val explicitCwe = filter(availableWeaknesses, value => value.rlike("^CWE-"))

      coalesce(element_at(explicitCwe, 1), element_at(availableWeaknesses, 1))
    } else {
      lit(null).cast("string")
    }
  }

  /** Safely resolves a nested field to a column, or a typed null when it is absent. */
  private def optionalColumn(cveSchema: StructType, path: Seq[String], prefix: String): Column = {
    if (hasField(cveSchema, path)) col(s"$prefix.${path.mkString(".")}") else lit(null)
  }

  private def coalesceOrNull(columns: Seq[Column]): Column = {
    if (columns.isEmpty) lit(null) else columns.reduceLeft((left, right) => coalesce(left, right))
  }

  private def hasField(schema: StructType, path: Seq[String]): Boolean = {
    path.foldLeft(Option(schema): Option[org.apache.spark.sql.types.DataType]) {
      case (Some(currentSchema: StructType), fieldName) =>
        currentSchema.find(_.name == fieldName).map(_.dataType)
      case (Some(org.apache.spark.sql.types.ArrayType(elementType: StructType, _)), fieldName) =>
        elementType.find(_.name == fieldName).map(_.dataType)
      case _ => None
    }.isDefined
  }

  private def countJsonFiles(directory: Path): Long = {
    val files = Files.list(directory)
    try files.iterator().asScala.count(path => path.getFileName.toString.toLowerCase.endsWith(".json"))
    finally files.close()
  }
}

/**
  * Hadoop 3 can call a Windows-native permission method while globbing local
  * paths. The local Spark environment has no winutils.exe, so this adapter
  * performs the same local file metadata operations through Java instead.
  */
class WindowsSafeLocalFileSystem extends RawLocalFileSystem {
  override def getFileStatus(path: HadoopPath): FileStatus = fileStatus(path)

  override def listStatus(path: HadoopPath): Array[FileStatus] = {
    val file = pathToFile(path)
    if (!file.exists()) {
      throw new FileNotFoundException(s"Path does not exist: $path")
    }

    if (file.isFile) Array(fileStatus(path))
    else Option(file.listFiles()).getOrElse(Array.empty).map { child =>
      fileStatus(new HadoopPath(path, child.getName))
    }
  }

  override def setPermission(path: HadoopPath, permission: FsPermission): Unit = {
    // Local development does not require Hadoop permission emulation.
  }

  private def fileStatus(path: HadoopPath): FileStatus = {
    val file = pathToFile(path)
    if (!file.exists()) {
      throw new FileNotFoundException(s"Path does not exist: $path")
    }

    new FileStatus(
      file.length(),
      file.isDirectory,
      1,
      getDefaultBlockSize(path),
      file.lastModified(),
      makeQualified(path)
    )
  }
}

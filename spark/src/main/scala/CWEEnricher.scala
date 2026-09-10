import java.io.InputStream
import java.nio.file.{Files, Path, Paths}
import java.util.zip.ZipFile
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilderFactory

import scala.collection.JavaConverters._

import org.apache.spark.sql.{DataFrame, Row, SparkSession}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types.{StringType, StructField, StructType}
import org.apache.hadoop.fs.RawLocalFileSystem
import org.w3c.dom.{Element, Node}

/**
  * Enriches normalized NVD CVEs with names and descriptions from MITRE's
  * official CWE catalog. The catalog ZIP is retained under data/raw/cwe/ and
  * parsed in-process so the enrichment stays in the Scala/Spark pipeline.
  */
object CWEEnricher {

  private case class CweReference(cwe_id: String, cwe_name: String, cwe_description: String)

  private val RequiredCveColumns = Seq(
    "cve_id",
    "published",
    "last_modified",
    "description",
    "cvss_score",
    "severity",
    "attack_vector",
    "attack_complexity",
    "privileges_required",
    "user_interaction",
    "scope",
    "cwe_id"
  )

  private val CweReferenceSchema = StructType(Seq(
    StructField("cwe_id", StringType, nullable = false),
    StructField("cwe_name", StringType, nullable = true),
    StructField("cwe_description", StringType, nullable = true)
  ))

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("CWE Enricher")
      .master("local[*]")
      // Use the existing local adapter so Hadoop does not require winutils.exe
      // while working with Windows local filesystem paths.
      .config("spark.hadoop.fs.file.impl", classOf[WindowsSafeLocalFileSystem].getName)
      .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    try {
      val projectRoot = resolveProjectRoot()
      val cveInputPath = projectRoot.resolve("data").resolve("processed").resolve("cves.parquet")
      val cweSourcePath = projectRoot.resolve("data").resolve("raw").resolve("cwe").resolve("cwec_latest.xml.zip")
      val enrichedOutputPath = projectRoot.resolve("data").resolve("processed").resolve("cves_enriched.parquet")

      require(Files.isDirectory(cveInputPath), s"Normalized CVE Parquet directory not found: $cveInputPath")
      require(Files.isRegularFile(cweSourcePath), s"MITRE CWE catalog not found: $cweSourcePath")

      val inputCves = spark.read.parquet(cveInputPath.toUri.toString).cache()
      validateCveSchema(inputCves)
      val inputCount = inputCves.count()

      val rawCweReference = cweReferenceDataFrame(spark, readCweCatalog(cweSourcePath))
      val cweReference = rawCweReference
        .withColumn("cwe_id", upper(trim(col("cwe_id"))))
        .withColumn("cwe_name", trim(col("cwe_name")))
        .withColumn("cwe_description", trim(col("cwe_description")))
        .filter(col("cwe_id").isNotNull && length(col("cwe_id")) > 0)
        // Each CWE ID must be unique before the join so one CVE remains one row.
        .dropDuplicates("cwe_id")
        .cache()

      val rawCweReferenceCount = rawCweReference.count()
      val cweReferenceCount = cweReference.count()
      require(cweReferenceCount > 0, s"No usable CWE records were parsed from: $cweSourcePath")

      val cves = inputCves.alias("cves")
      val cwes = cweReference.alias("cwes")
      val enriched = cves
        // A left join deliberately preserves every CVE, even when NVD did not
        // provide a CWE ID or the catalog has no metadata for that ID.
        .join(cwes, col("cves.cwe_id") === col("cwes.cwe_id"), "left")
        .select(
          RequiredCveColumns.map(columnName => col(s"cves.$columnName")) ++ Seq(
            col("cwes.cwe_name"),
            col("cwes.cwe_description")
          ): _*
        )

      enriched.write.mode("overwrite").parquet(enrichedOutputPath.toUri.toString)

      // Reload output to validate the persisted enrichment, not only the
      // in-memory join result.
      val persistedEnriched = spark.read.parquet(enrichedOutputPath.toUri.toString).cache()
      val enrichedCount = persistedEnriched.count()
      val cweMatches = persistedEnriched
        .filter(col("cwe_name").isNotNull || col("cwe_description").isNotNull)
        .count()
      val cweUnmatched = enrichedCount - cweMatches
      val duplicateCveIds = persistedEnriched
        .filter(col("cve_id").isNotNull)
        .groupBy("cve_id")
        .count()
        .filter(col("count") > 1)
        .count()

      println(s"Project root: $projectRoot")
      println(s"CWE source: $cweSourcePath")
      println(s"CWE reference records parsed: $rawCweReferenceCount")
      println(s"CWE reference records after deduplication: $cweReferenceCount")
      println(s"Input CVEs: $inputCount")
      println(s"Enriched CVEs: $enrichedCount")
      println(s"CWE matches: $cweMatches")
      println(s"CWE unmatched: $cweUnmatched")
      println(s"Duplicate CVE IDs: $duplicateCveIds")
      println(s"Enriched Parquet written to: $enrichedOutputPath")

      require(
        enrichedCount == inputCount,
        s"Enrichment validation failed: input=$inputCount, enriched=$enrichedCount"
      )
      require(duplicateCveIds == 0, s"Enrichment introduced duplicate CVE IDs: $duplicateCveIds")

      persistedEnriched.unpersist()
      cweReference.unpersist()
      inputCves.unpersist()
    } finally {
      spark.stop()
    }
  }

  /** Resolves the repository root whether SBT starts in spark/ or the root. */
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

  private def validateCveSchema(cves: DataFrame): Unit = {
    val missingColumns = RequiredCveColumns.filterNot(cves.columns.contains)
    require(missingColumns.isEmpty, s"cves.parquet is missing required columns: ${missingColumns.mkString(", ")}")
  }

  /** Builds a DataFrame without relying on a Scala case-class encoder. */
  private def cweReferenceDataFrame(spark: SparkSession, records: Seq[CweReference]): DataFrame = {
    val rows = records.map(record => Row(record.cwe_id, record.cwe_name, record.cwe_description))
    spark.createDataFrame(spark.sparkContext.parallelize(rows, 1), CweReferenceSchema)
  }

  /** Parses the single CWE XML catalog stored in MITRE's official ZIP download. */
  private def readCweCatalog(cweZipPath: Path): Seq[CweReference] = {
    val zip = new ZipFile(cweZipPath.toFile)

    try {
      val xmlEntries = zip.entries().asScala
        .filter(entry => !entry.isDirectory && entry.getName.toLowerCase.endsWith(".xml"))
        .toSeq

      require(xmlEntries.size == 1, s"Expected one XML file in CWE ZIP, found ${xmlEntries.size}: $cweZipPath")

      val xmlStream = zip.getInputStream(xmlEntries.head)
      try parseWeaknesses(xmlStream)
      finally xmlStream.close()
    } finally {
      zip.close()
    }
  }

  private def parseWeaknesses(xmlStream: InputStream): Seq[CweReference] = {
    val factory = DocumentBuilderFactory.newInstance()
    factory.setNamespaceAware(true)
    factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
    factory.setFeature("http://xml.org/sax/features/external-general-entities", false)
    factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false)
    factory.setXIncludeAware(false)
    factory.setExpandEntityReferences(false)

    val document = factory.newDocumentBuilder().parse(xmlStream)
    val weaknessNodes = document.getElementsByTagNameNS("*", "Weakness")

    (0 until weaknessNodes.getLength).flatMap { index =>
      val weakness = weaknessNodes.item(index).asInstanceOf[Element]
      val id = weakness.getAttribute("ID").trim
      val name = weakness.getAttribute("Name").trim
      val description = directChildText(weakness, "Description")

      if (id.matches("\\d+")) {
        Some(CweReference(s"CWE-$id", name, description))
      } else {
        None
      }
    }
  }

  /** Gets the text of a direct XML child to avoid unrelated nested descriptions. */
  private def directChildText(parent: Element, localName: String): String = {
    val children = parent.getChildNodes

    (0 until children.getLength).collectFirst {
      case index if children.item(index).getNodeType == Node.ELEMENT_NODE &&
        children.item(index).getLocalName == localName =>
        children.item(index).getTextContent.replaceAll("\\s+", " ").trim
    }.orNull
  }
}

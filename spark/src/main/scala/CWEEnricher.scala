import java.io.InputStream
import java.nio.file.{Files, Path, Paths}
import java.util.zip.ZipFile
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilderFactory

import scala.collection.JavaConverters._

import org.apache.hadoop.fs.RawLocalFileSystem
import org.apache.spark.sql.{DataFrame, Row, SparkSession}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types.{StringType, StructField, StructType}
import org.w3c.dom.{Element, Node}

/** Enriches cves.parquet with canonical CWE relationships and MITRE metadata. */
object CWEEnricher {
  private case class CweReference(cwe_id: String, cwe_name: String, cwe_description: String)

  private val RequiredCveColumns = Seq(
    "cve_id", "published", "last_modified", "description", "cvss_score", "severity",
    "attack_vector", "attack_complexity", "privileges_required", "user_interaction", "scope", "cwe_id"
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
      .config("spark.hadoop.fs.file.impl", classOf[WindowsSafeLocalFileSystem].getName)
      .getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    try {
      val projectRoot = resolveProjectRoot()
      val inputPath = projectRoot.resolve("data").resolve("processed").resolve("cves.parquet")
      val cweSourcePath = projectRoot.resolve("data").resolve("raw").resolve("cwe").resolve("cwec_latest.xml.zip")
      val enrichedPath = projectRoot.resolve("data").resolve("processed").resolve("cves_enriched.parquet")
      val summaryPath = projectRoot.resolve("data").resolve("processed").resolve("cwe_summary.parquet")

      require(Files.isDirectory(inputPath), s"Normalized CVE Parquet directory not found: $inputPath")
      require(Files.isRegularFile(cweSourcePath), s"MITRE CWE catalog not found: $cweSourcePath")

      val input = spark.read.parquet(inputPath.toUri.toString).cache()
      validateCveSchema(input)
      val inputCount = input.count()

      val references = cweReferenceDataFrame(spark, readCweCatalog(cweSourcePath))
        .withColumn("cwe_id", upper(trim(col("cwe_id"))))
        .withColumn("cwe_name", trim(col("cwe_name")))
        .withColumn("cwe_description", trim(col("cwe_description")))
        .filter(col("cwe_id").isNotNull && length(col("cwe_id")) > 0)
        .dropDuplicates("cwe_id")
        .cache()
      require(references.count() > 0, s"No usable CWE records were parsed from: $cweSourcePath")

      // Keep the original scalar cwe_id for existing ML consumers; cwe_ids is canonical.
      val normalized = input
        .withColumn("cwe_ids", normalizedCweIds(col("cwe_id")))
        .withColumn("cwe_count", size(col("cwe_ids")))

      val relationships = normalized
        .select(col("cve_id"), col("cwe_ids"), col("cvss_score"), col("severity"))
        .withColumn("cwe_id", explode(col("cwe_ids")))
        .dropDuplicates("cve_id", "cwe_id")

      val metadata = relationships
        .join(references, Seq("cwe_id"), "left")
        .groupBy("cve_id")
        .agg(sort_array(collect_list(struct(col("cwe_id"), col("cwe_name"), col("cwe_description")))).as("cwe_metadata"))
        .withColumn("cwe_names", expr("transform(cwe_metadata, x -> x.cwe_name)"))
        .withColumn("cwe_descriptions", expr("transform(cwe_metadata, x -> x.cwe_description)"))
        .withColumn("cwe_name", element_at(col("cwe_names"), 1))
        .withColumn("cwe_description", element_at(col("cwe_descriptions"), 1))
        .drop("cwe_metadata")

      val enriched = normalized
        .join(metadata, Seq("cve_id"), "left")
        .withColumn("cwe_names", coalesce(col("cwe_names"), typedLit(Seq.empty[String])))
        .withColumn("cwe_descriptions", coalesce(col("cwe_descriptions"), typedLit(Seq.empty[String])))
        .orderBy(col("cve_id").asc)

      enriched.write.mode("overwrite").parquet(enrichedPath.toUri.toString)
      val persisted = spark.read.parquet(enrichedPath.toUri.toString).cache()
      val outputCount = persisted.count()
      val withCwe = persisted.filter(size(col("cwe_ids")) > 0).count()
      val withoutCwe = outputCount - withCwe
      val duplicateCves = persisted.groupBy("cve_id").count().filter(col("count") > 1).count()
      val nullOrEmptyCwe = persisted.filter(size(col("cwe_ids")) === 0).count()
      val relationshipCount = relationships.count()
      val multiCweCves = persisted.filter(size(col("cwe_ids")) > 1).count()
      val distinctCweCount = relationships.select("cwe_id").distinct().count()

      val summary = relationships
        .join(references, Seq("cwe_id"), "left")
        .withColumn("high_severity", upper(trim(col("severity"))).isin("HIGH", "CRITICAL"))
        .groupBy("cwe_id", "cwe_name")
        .agg(
          countDistinct("cve_id").as("cve_count"),
          avg("cvss_score").as("average_cvss"),
          max("cvss_score").as("maximum_cvss"),
          min("cvss_score").as("minimum_cvss"),
          sum(when(col("high_severity"), 1).otherwise(0)).cast("long").as("high_severity_count")
        )
        .orderBy(col("cwe_id").asc)

      summary.write.mode("overwrite").parquet(summaryPath.toUri.toString)
      val persistedSummary = spark.read.parquet(summaryPath.toUri.toString)

      println(s"Project root: $projectRoot")
      println(s"Input CVE count: $inputCount")
      println(s"Output CVE count: $outputCount")
      println(s"CVEs with CWE: $withCwe")
      println(s"CVEs without CWE: $withoutCwe")
      println(s"Distinct CWE count: $distinctCweCount")
      println(s"Duplicate CVE count: $duplicateCves")
      println(s"Null/empty CWE count after enrichment: $nullOrEmptyCwe")
      println(s"Total CVE-CWE relationships: $relationshipCount")
      println(s"CVEs with multiple CWE classifications: $multiCweCves")
      println(s"CWE summary rows: ${persistedSummary.count()}")
      persisted.printSchema()
      persistedSummary.show(50, truncate = false)

      require(outputCount == inputCount, s"Output CVE count changed: input=$inputCount, output=$outputCount")
      require(duplicateCves == 0, s"Enrichment introduced duplicate CVEs: $duplicateCves")
      require(Files.isDirectory(summaryPath), s"CWE summary was not created: $summaryPath")

      persisted.unpersist()
      references.unpersist()
      input.unpersist()
    } finally {
      spark.stop()
    }
  }

  private def normalizedCweIds(source: org.apache.spark.sql.Column): org.apache.spark.sql.Column = {
    array_distinct(transform(
      regexp_extract_all(coalesce(source.cast("string"), lit("")), lit("(?i)(CWE-[0-9]+)"), lit(1)),
      id => upper(trim(id))
    ))
  }

  private def resolveProjectRoot(): Path = {
    val workingDirectory = Paths.get("").toAbsolutePath.normalize()
    val candidates = Seq(workingDirectory) ++ Option(workingDirectory.getParent).toSeq
    candidates.find(candidate => Files.isDirectory(candidate.resolve("spark")) && Files.isDirectory(candidate.resolve("data")))
      .getOrElse(throw new IllegalStateException(s"Could not locate project root from: $workingDirectory"))
  }

  private def validateCveSchema(cves: DataFrame): Unit = {
    val missing = RequiredCveColumns.filterNot(cves.columns.contains)
    require(missing.isEmpty, s"cves.parquet is missing required columns: ${missing.mkString(", ")}")
  }

  private def cweReferenceDataFrame(spark: SparkSession, records: Seq[CweReference]): DataFrame = {
    val rows = records.map(record => Row(record.cwe_id, record.cwe_name, record.cwe_description))
    spark.createDataFrame(spark.sparkContext.parallelize(rows, 1), CweReferenceSchema)
  }

  private def readCweCatalog(cweZipPath: Path): Seq[CweReference] = {
    val zip = new ZipFile(cweZipPath.toFile)
    try {
      val xmlEntries = zip.entries().asScala.filter(entry => !entry.isDirectory && entry.getName.toLowerCase.endsWith(".xml")).toSeq
      require(xmlEntries.size == 1, s"Expected one XML file in CWE ZIP, found ${xmlEntries.size}: $cweZipPath")
      val stream = zip.getInputStream(xmlEntries.head)
      try parseWeaknesses(stream) finally stream.close()
    } finally zip.close()
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
      if (id.matches("\\d+")) Some(CweReference(s"CWE-$id", weakness.getAttribute("Name").trim, directChildText(weakness, "Description")))
      else None
    }
  }

  private def directChildText(parent: Element, localName: String): String = {
    val children = parent.getChildNodes
    (0 until children.getLength).collectFirst {
      case index if children.item(index).getNodeType == Node.ELEMENT_NODE && children.item(index).getLocalName == localName =>
        children.item(index).getTextContent.replaceAll("\\s+", " ").trim
    }.orNull
  }
}

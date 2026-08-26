import org.apache.spark.sql.SparkSession

object SparkTest {

  def main(args: Array[String]): Unit = {

    val spark = SparkSession.builder()
      .appName("CybersecurityThreatIntelTest")
      .master("local[*]")
      .getOrCreate()

    import spark.implicits._

    val data = Seq(
      ("CVE-TEST-001", 9.8),
      ("CVE-TEST-002", 7.5),
      ("CVE-TEST-003", 5.3)
    )

    val df = data.toDF("cve_id", "cvss_score")

    df.show()

    spark.stop()
  }
}

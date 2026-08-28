import java.io.ByteArrayOutputStream
import java.net.{HttpURLConnection, URI}
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path, Paths}

object NVDFetcher {

  private val ApiUrl = "https://services.nvd.nist.gov/rest/json/cves/2.0"
  private val ResultsPerPage = 10
  private val MaxPages = 2
  private val DelayBetweenRequestsMs = 6000L
  private val ApiKeyEnvironmentVariable = "NVD_API_KEY"

  private val TotalResultsPattern = """"totalResults"\s*:\s*(\d+)""".r
  private val CveRecordPattern = """"cve"\s*:""".r

  def main(args: Array[String]): Unit = {
    val outputDirectory = resolveOutputDirectory()
    Files.createDirectories(outputDirectory)

    val apiKey = sys.env.get(ApiKeyEnvironmentVariable)
    var startIndex = 0
    var pageNumber = 0
    var totalResults: Option[Int] = None

    while (pageNumber < MaxPages && totalResults.forall(startIndex < _)) {
      if (pageNumber > 0) {
        // A delay reduces request rate while the unauthenticated API is being tested.
        Thread.sleep(DelayBetweenRequestsMs)
      }

      val responseBytes = fetchPage(startIndex, apiKey)
      val outputPath = outputDirectory.resolve(f"page_$pageNumber%03d.json")

      // Keep the complete response untouched for the raw-storage step of the pipeline.
      Files.write(outputPath, responseBytes)

      val responseText = new String(responseBytes, StandardCharsets.UTF_8)
      val returned = CveRecordPattern.findAllMatchIn(responseText).length
      val pageTotalResults = TotalResultsPattern
        .findFirstMatchIn(responseText)
        .map(_.group(1).toInt)
        .getOrElse(throw new RuntimeException("NVD response did not contain totalResults"))

      totalResults = Some(pageTotalResults)
      println(s"Page $pageNumber: startIndex=$startIndex, vulnerabilities returned=$returned")
      println(s"Saved raw response to ${outputPath.toAbsolutePath}")

      startIndex += returned
      pageNumber += 1

      if (returned == 0) {
        totalResults = Some(startIndex)
      }
    }
  }

  private def fetchPage(startIndex: Int, apiKey: Option[String]): Array[Byte] = {
    val query = s"startIndex=$startIndex&resultsPerPage=$ResultsPerPage"
    val connection = URI.create(s"$ApiUrl?$query").toURL.openConnection().asInstanceOf[HttpURLConnection]
    connection.setRequestMethod("GET")
    connection.setRequestProperty("Accept", "application/json")
    apiKey.foreach(key => connection.setRequestProperty("apiKey", key))
    connection.setConnectTimeout(15000)
    connection.setReadTimeout(60000)

    try {
      val status = connection.getResponseCode
      if (status != HttpURLConnection.HTTP_OK) {
        val errorBody = Option(connection.getErrorStream)
          .map(readStream)
          .map(bytes => new String(bytes, StandardCharsets.UTF_8).trim)
          .filter(_.nonEmpty)
          .map(body => s": $body")
          .getOrElse("")
        throw new RuntimeException(s"NVD API request failed with HTTP $status$errorBody")
      }

      readStream(connection.getInputStream)
    } catch {
      case error: RuntimeException => throw error
      case error: Exception =>
        throw new RuntimeException(s"Unable to fetch NVD data: ${error.getMessage}", error)
    } finally {
      connection.disconnect()
    }
  }

  private def readStream(inputStream: java.io.InputStream): Array[Byte] = {
    val output = new ByteArrayOutputStream()
    val buffer = new Array[Byte](8192)
    var bytesRead = inputStream.read(buffer)
    while (bytesRead != -1) {
      output.write(buffer, 0, bytesRead)
      bytesRead = inputStream.read(buffer)
    }
    inputStream.close()
    output.toByteArray
  }

  private def resolveOutputDirectory(): Path = {
    var directory = Paths.get(System.getProperty("user.dir")).toAbsolutePath.normalize()
    while (directory != null) {
      if (Files.isDirectory(directory.resolve("spark")) && Files.isDirectory(directory.resolve("data"))) {
        return directory.resolve("data").resolve("raw").resolve("nvd")
      }
      directory = directory.getParent
    }
    throw new RuntimeException("Could not locate project root containing both spark and data directories")
  }
}
ThisBuild / scalaVersion := "2.12.18"

val sparkVersion = "3.5.9"

Compile / run / fork := true
Compile / run / javaOptions += "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED"

libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % sparkVersion,
  "org.apache.spark" %% "spark-sql" % sparkVersion
)

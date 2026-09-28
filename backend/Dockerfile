FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd -m -u 10001 appuser
COPY --from=build --chown=appuser:appuser /workspace/target/backend-0.0.1-SNAPSHOT.jar app.jar
USER appuser

EXPOSE 8080 9090
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]

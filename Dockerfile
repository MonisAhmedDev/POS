FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /workspace

COPY index.html style.css app.js /workspace/
COPY fastfoodbackend/gradlew /workspace/fastfoodbackend/gradlew
COPY fastfoodbackend/gradlew.bat /workspace/fastfoodbackend/gradlew.bat
COPY fastfoodbackend/gradle /workspace/fastfoodbackend/gradle
COPY fastfoodbackend/build.gradle /workspace/fastfoodbackend/build.gradle
COPY fastfoodbackend/settings.gradle /workspace/fastfoodbackend/settings.gradle
COPY fastfoodbackend/src /workspace/fastfoodbackend/src

WORKDIR /workspace/fastfoodbackend
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-jammy

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV APP_UPLOAD_DIR=/data/uploads

COPY --from=builder /workspace/fastfoodbackend/build/libs/*.jar /app/app.jar

EXPOSE 8080
VOLUME ["/data/uploads"]

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

FROM gradle:jdk17 AS builder
WORKDIR /app
COPY --chown=gradle:gradle . .
# Use the installed gradle from the image
RUN gradle build --no-daemon -x test

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]

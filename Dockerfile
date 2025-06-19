# Базовый образ для сборки
FROM gradle:8.10-jdk17 AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы Gradle и исходный код
COPY build.gradle settings.gradle ./
COPY src ./src

# Собираем JAR-файл
RUN gradle clean build -x test

# Финальный образ для запуска
FROM openjdk:17-jdk-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем собранный JAR из builder-стадии
COPY --from=builder /app/build/libs/*.jar app.jar

# Указываем порт
EXPOSE 8080

# Команда для запуска приложения
ENTRYPOINT ["java", "-jar", "app.jar"]
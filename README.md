# Map Editor

Map Editor — это веб-приложение для создания, редактирования и визуализации объектов на интерактивной карте. Backend реализован на **Spring Boot** с использованием **MyBatis** для работы с базой данных **PostgreSQL**, а frontend — на **JavaScript**. Приложение предоставляет REST API для управления объектами и их отображения.

## Технологический стек
- **Backend**:
   - **Spring Boot 3.4.6**: Фреймворк для создания RESTful API и управления зависимостями.
   - **MyBatis 3.0.4**: ORM для взаимодействия с PostgreSQL, обеспечивающий гибкость SQL-запросов.
   - **PostgreSQL**: Реляционная база данных для хранения данных об объектах.
   - **Logback и SLF4J**: Логирование серверной части.
   - **Lombok**: Упрощение boilerplate-кода.
   - **Java 17**
- **Frontend**:
   - **JavaScript**: Интерактивный интерфейс карты (`map.js`) для работы с объектами.
   - **HTML/CSS**: Статические ресурсы для отображения пользовательского интерфейса.
- **Сборка и деплой**:
   - **Gradle 8.10**: Система сборки с плагинами для Spring Boot.
   - **Docker**: Контейнеризация приложения (Spring Boot и PostgreSQL).
   - **Docker Compose**: Оркестрация контейнеров для локального и тестового окружения.

## Требования
- **Docker** и **Docker Compose** (для сборки и запуска).
- **Node.js** и **npm** (для LocalTunnel, если требуется внешний доступ).
- **Git** (для клонирования репозитория).
- ОС: Windows, Linux или macOS.

## Установка и запуск

### 1. Скачивание проекта
1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/pathfind1103/map-editor.git
   cd map-editor
   ```
2. Убедитесь, что Docker и Docker Compose установлены:
   ```bash
   docker --version
   docker-compose --version
   ```
   Если они отсутствуют, установите их с [docker.com](https://www.docker.com/get-started).

### 2. Сборка и запуск в Docker
1. Соберите и запустите приложение:
   ```bash
   docker-compose up -d --build
   ```
   - Это создаёт три контейнера: `postgres_container` (база данных PostgreSQL), `pgadmin_container` (управление базой данных) и `map_service_container` (серверная часть на Spring Boot и MyBatis).
   - Фронтенд и REST API доступны на порту 8080.
2. Проверьте статус контейнеров:
   ```bash
   docker-compose ps
   ```
3. Если возникли проблемы, проверьте логи:
   ```bash
   docker-compose logs map-service
   ```

### 3. Тестирование приложения
Приложение можно протестировать локально через `localhost` или предоставить внешний доступ через LocalTunnel.

#### Тестирование через localhost
1. Откройте в браузере:
   ```
   http://localhost:8080
   ```
   Вы увидите интерактивную карту с интерфейсом для управления объектами.
2. Проверьте REST API:
   ```bash
   curl http://localhost:8080/api/objects
   ```
   Ожидаемый результат: `[]` (или список объектов, если они добавлены).
3. Манипуляции с объектами:
   - Добавляйте, редактируйте или удаляйте объекты через веб-интерфейс.
   - Изменения сохраняются в PostgreSQL.

#### Тестирование через LocalTunnel (внешний доступ)
1. Убедитесь, что **Node.js** установлен:
   - Скачайте LTS-версию с [nodejs.org](https://nodejs.org).
   - Проверьте:
     ```bash
     node -v
     npm -v
     ```
2. Установите LocalTunnel:
   ```bash
   npm install -g localtunnel
   lt --version
   ```
3. Запустите туннель для порта 8080:
   ```bash
   lt --port 8080 --subdomain mapeditor 
   ```
   или так, если возникли проблемы с ```lt```
   ```
   npx localtunnel --port 8080 --subdomain mapeditor
   ```
   Вы получите публичный URL, например:
   ```
   https://mapeditor.loca.lt
   ```
4. Откройте `https://mapeditor.loca.lt` в браузере:
   - Убедитесь, что карта загружается и функционал работает.
   
5. Проверьте API:
   ```bash
   curl https://mapeditor.loca.lt/api/objects
   ```

### 4. Остановка приложения
Чтобы остановить контейнеры:
```bash
docker-compose down
```

### Примечания
- **CORS**: Настроен через `SimpleCORSFilter` для поддержки `https://mapeditor.loca.lt` и `http://localhost:8080`.
- **Ограничения LocalTunnel**: Временный URL, ограничение на 3–4 одновременных соединения.
- **Логирование**: Логи сервера сохраняются в `logs/application.log`.

### Устранение неполадок
- **Контейнер не стартует**: Проверьте логи:
  ```bash
  docker-compose logs map-service
  ```
  Убедитесь, что порт 8080 свободен:
  ```bash
  netstat -ano | findstr :8080
  taskkill /PID <PID> /F
  ```
- **LocalTunnel не работает**: Проверьте доступность приложения на `http://localhost:8080` и наличие интернет-соединения.

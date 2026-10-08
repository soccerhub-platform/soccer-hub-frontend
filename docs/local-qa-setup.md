# Локальный запуск и QA

## Стенд

Frontend: `/Users/admin/workplace/soccer-hub-front`. Backend: `/Users/admin/workplace/freelance/soccer-hub`.

Нужны Node.js 24, Java 21+, Docker и существующая конфигурация backend. PostgreSQL проекта доступен на 5490. Проверки записывающих сценариев запускать только на тестовой базе. Не использовать production-учётную запись.

1. Запустите Docker. Если контейнер базы уже существует, запустите именно его, не создавая другую базу:

```sh
rtk proxy docker --context default ps -a --filter name=soccer-hub-db-1
rtk proxy docker --context default start soccer-hub-db-1
```

При первом развёртывании используйте `docker-compose.yaml` backend-проекта и задайте свои настройки БД. Не выполняйте `down -v`: эта команда удаляет том данных.

2. В каталоге backend:

```sh
rtk proxy ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

Liquibase применит новую миграцию рабочих полей лида при старте. Перед рабочим развёртыванием сделайте резервную копию. Откат миграции удаляет данные задач — не выполнять его автоматически. Проверка готовности: `http://localhost:8081/actuator/health`, ожидается UP.

3. В каталоге frontend, dev-режим:

```sh
rtk npm ci
rtk proxy env VITE_API_BASE_URL=/api VITE_API_PROXY_TARGET=http://localhost:8081 npm run dev -- --host 127.0.0.1 --port 3001 --strictPort
```

Открыть `http://127.0.0.1:3001/admin/leads`. Для входа используйте тестового администратора. Логин и пароль не записывайте в репозиторий.

4. Для проверки сборки, в другом терминале:

```sh
rtk proxy env VITE_API_BASE_URL=/api npm run build
rtk proxy env VITE_API_PROXY_TARGET=http://localhost:8081 npm run preview -- --host 127.0.0.1 --port 3002 --strictPort
```

Preview доступен на `http://127.0.0.1:3002/admin/leads`. Это локальный предпросмотр, не сервер для рабочего размещения. В production настройте HTTPS, историю SPA и reverse proxy: обычный `/api` снимается перед передачей backend, `/api/media/` сохраняется.

## Проверки

```sh
rtk npm run typecheck
rtk npm run lint
rtk npm run test
rtk npm audit
```

Backend: `rtk proxy ./mvnw test` из его каталога.

Установите браузер Playwright при первом запуске: `rtk proxy npx playwright install chromium`.

Передайте `E2E_EMAIL` и `E2E_PASSWORD` в окружение терминала безопасным способом, не сохраняя пароль в файлах. Затем:

```sh
rtk proxy env E2E_BASE_URL=http://127.0.0.1:3002 npm run test:e2e
```

Без флага записи бизнес-сценарий будет пропущен. Для полного локального прогона:

```sh
rtk proxy env E2E_BASE_URL=http://127.0.0.1:3002 E2E_ALLOW_WRITES=1 npm run test:e2e
```

Нужны активная детская группа и будущее запланированное занятие в следующие 60 дней; для проверки переноса — второе занятие. Даты и идентификаторы ищутся через API, а не зашиваются в тест. QA-заявка создаётся в выбранном тестовом филиале, пробное отменяется после проверки; QA-клиент и ученик сохраняются. Создание и активация договора в негативном тесте перехватываются Playwright и не меняют БД.

Отчёт: `rtk npm run test:e2e:report`. В `playwright-report` и `test-results` могут оказаться персональные данные и чувствительные запросы; каталоги исключены из git. Перед передачей отчёта наружу требуется обезличивание.

Если после паузы вход перестал работать, сначала проверьте Docker и `/actuator/health`. Не меняйте пароль и не сбрасывайте БД до диагностики.

## QA dispatcher

Для следующих проверок диспетчера используйте `codex.dispatcher@qa.soccerhub.test` с ролью `DISPATCHER` на `http://127.0.0.1:3001`. Локальный пароль сохранён в `.local-qa/dispatcher.json`, каталог исключён из git. Не публикуйте этот файл.

В dev базе сохранены `QA Dispatcher Club`, два QA филиала и заявки для проверки пагинации. Повторно используйте их вместо создания дубликатов. Результаты проверки: [dispatcher audit](dispatcher-ui-ux-audit-2026-10-08.md).

## Внешние подключения

Для текущего функционала дополнительные сервисы не нужны. Автоматические рассылки, платёжный провайдер и облачный мониторинг не подключены. Перед их интеграцией отдельно нужны выбор провайдера, тестовый аккаунт, права доступа и секреты через защищённое окружение; реальные платежи/сообщения нельзя включать в QA по умолчанию.

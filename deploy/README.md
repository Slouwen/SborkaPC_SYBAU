# SborkaPC Deploy

Отдельный репозиторий для запуска готового контейнера приложения. Основной репозиторий собирает и публикует Docker image в GHCR.

## Запуск

1. Установите Docker Engine и Docker Compose.
2. Скопируйте `.env.example` в `.env` и укажите секретный ключ Supabase.
3. Положите локальные сертификаты `sborkapc.localhost.pem` и `sborkapc.localhost-key.pem` в `certs/`. Не коммитьте приватный ключ.
4. Запустите `docker compose up -d`.

Образ: `ghcr.io/slouwen/sborkapc:latest`. Если пакет GHCR приватный, предварительно выполните `docker login ghcr.io`.

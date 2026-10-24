# ======================================================
# Dockerfile бэкенда ПрофПуть.
# PocketBase - однофайловый бэкенд на Go со встроенной
# SQLite-базой, REST API и панелью администратора.
# ======================================================
FROM alpine:3.19

# ВАЖНО: версия должна СОВПАДАТЬ с версией, на которой локально
# создавались миграции (проверить: ./pocketbase.exe --version).
# Несовпадение версии = миграции не применятся на пустой базе сервера.
ARG POCKETBASE_VERSION=0.40.6

RUN apk add --no-cache ca-certificates unzip wget

WORKDIR /pb

RUN wget "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" -O pocketbase.zip \
    && unzip pocketbase.zip \
    && rm pocketbase.zip

# Миграции (описание коллекций users/progress/minigame_results как код).
# Применяются автоматически при первом старте на пустой базе данных.
COPY pb_migrations /pb/pb_migrations

EXPOSE 8090

# Для VPS порт всегда 8090 (Nginx проксирует его извне) — переменная PORT
# здесь не нужна (это было специфично под Railway), но оставляю fallback
# на случай ручного запуска с другим портом.
CMD ["sh", "-c", "/pb/pocketbase serve --http=0.0.0.0:${PORT:-8090}"]
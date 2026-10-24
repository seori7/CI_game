# Бэкенд ПрофПути (PocketBase)

PocketBase — однофайловый бэкенд на языке Go со встроенной базой данных
(SQLite), REST API, системой авторизации и веб-панелью администратора.
Отдельный сервер базы данных, отдельный backend-фреймворк — не нужны,
всё включено в один исполняемый файл.

Публичный адрес (боевой деплой): https://217-144-184-195.sslip.io

## Вариант 1 — проверка боевого бэкенда напрямую (без установки чего-либо)

Эти команды можно выполнить в любом терминале с curl (Windows PowerShell,
macOS/Linux Terminal) — показывают, что бэкенд реально хранит и отдаёт
данные, независимо от фронтенда игры.

### 1. Регистрация тестового пользователя
curl -X POST "https://217-144-184-195.sslip.io/api/collections/users/records" ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"judge@example.com\",\"password\":\"TestPass123!\",\"passwordConfirm\":\"TestPass123!\"}"

### 2. Логин и получение токена доступа
curl -X POST "https://217-144-184-195.sslip.io/api/collections/users/auth-with-password" ^
-H "Content-Type: application/json" ^
-d "{\"identity\":\"judge@example.com\",\"password\":\"TestPass123!\"}"

### 3. Запись прогресса (подставить token и id из шага 2)
curl -X POST "https://217-144-184-195.sslip.io/api/collections/progress/records" ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer <TOKEN>" ^
-d "{\"user\":\"<USER_ID>\",\"nickname\":\"Judge\",\"currentChapter\":0,\"completedMinigames\":[],\"stressProfile\":{\"programmer\":0,\"builder\":0,\"medic\":0}}"

### 4. Чтение прогресса обратно
curl "https://217-144-184-195.sslip.io/api/collections/progress/records" -H "Authorization: Bearer <TOKEN>"

## Вариант 2 — полный запуск бэкенда с нуля локально (БЕЗ Docker)

Это самый простой способ для эксперта, который хочет запустить код сам,
а не просто поверить задеплоенной версии.

1. Клонировать репозиторий, перейти в папку backend/:
git clone <ссылка на репозиторий>
cd <репозиторий>/backend

2. Скачать нативный бинарник PocketBase под свою операционную систему
со страницы https://github.com/pocketbase/pocketbase/releases
(есть сборки под Windows, Linux, macOS).

3. Распаковать архив в эту же папку backend/ — рядом с ней уже лежит
папка pb_migrations/, которая обязательно должна остаться на месте.

4. Запустить сервер:
Windows: ./pocketbase.exe serve
Linux/macOS: ./pocketbase serve

5. PocketBase автоматически применит миграции из pb_migrations/ и
создаст все три коллекции (users, progress, minigame_results) со
всеми полями и правилами доступа — идентично боевому серверу.

6. Открыть в браузере адрес, который появится в консоли (обычно
http://127.0.0.1:8090/_/), создать superuser-аккаунт при первом входе.

7. Повторить curl-команды из "Варианта 1", подставив вместо
https://217-144-184-195.sslip.io адрес http://127.0.0.1:8090 — поведение идентично.

## Вариант 3 — воспроизведение продакшен-окружения через Docker (опционально)

Нужен только если хочется убедиться, что именно тот контейнер, который
запущен на боевом сервере (VPS), тоже работает один в один. Требует
установленного Docker Desktop (или Docker на Linux).

cd backend
docker build -t profpath-backend .
docker run -p 8090:8090 profpath-backend

Открыть http://127.0.0.1:8090/_/ — поведение идентично Варианту 2.

## Структура схемы данных (что создают миграции)

- Коллекция `users` (встроенная, auth) — анонимные учётные записи игроков,
создаются автоматически игрой при первом запуске (без показа игроку
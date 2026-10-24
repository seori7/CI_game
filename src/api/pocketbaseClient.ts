import PocketBase from 'pocketbase';

/**
 * Единственный экземпляр клиента PocketBase на всё приложение.
 * ВАЖНО: никакой другой модуль проекта не должен импортировать пакет
 * 'pocketbase' напрямую — только этот файл. Это даёт одну точку входа
 * для конфигурации (URL, интерцепторы, логирование) и упрощает замену
 * бэкенда в будущем.
 */
const POCKETBASE_URL: string =
  (import.meta.env.VITE_POCKETBASE_URL as string | undefined) ?? 'http://127.0.0.1:8090';

export const pocketbaseClient = new PocketBase(POCKETBASE_URL);

// Отключаем автоотмену запросов PocketBase по умолчанию: в игре возможны
// частые повторные вызовы (например, автосохранение), и отмена "на лету"
// предыдущего запроса может привести к потере данных прогресса.
pocketbaseClient.autoCancellation(false);

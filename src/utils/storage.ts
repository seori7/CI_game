/**
 * Безопасная обёртка над localStorage. Любая операция чтения/записи
 * оборачивается в try/catch, чтобы повреждённые данные, отключённый
 * localStorage (приватный режим браузера) или переполнение квоты
 * никогда не приводили к падению игры при старте.
 */

/**
 * Сохраняет произвольное значение в localStorage в виде JSON-строки.
 * @param key ключ, под которым сохраняются данные
 * @param value сохраняемое значение (должно быть JSON-сериализуемым)
 */
export function saveToLocal<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`[storage] Не удалось сохранить значение по ключу "${key}":`, error);
  }
}

/**
 * Загружает и парсит значение из localStorage.
 * Возвращает null, если ключ отсутствует или данные повреждены.
 * @param key ключ, по которому хранятся данные
 */
export function loadFromLocal<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[storage] Не удалось прочитать значение по ключу "${key}":`, error);
    return null;
  }
}

/**
 * Удаляет значение из localStorage по ключу (например, невалидный токен).
 * @param key ключ, который нужно удалить
 */
export function removeFromLocal(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`[storage] Не удалось удалить ключ "${key}":`, error);
  }
}

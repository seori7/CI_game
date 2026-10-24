/// <reference types="vite/client" />

/**
 * Типизация переменных окружения, используемых проектом.
 * Добавлено, чтобы import.meta.env.VITE_POCKETBASE_URL был типобезопасным.
 */
interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

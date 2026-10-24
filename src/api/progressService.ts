import { pocketbaseClient } from './pocketbaseClient';
import { loadFromLocal, removeFromLocal, saveToLocal } from '../utils/storage';
import {
  STORAGE_KEY_AUTH_TOKEN,
  STORAGE_KEY_PENDING_RESULTS,
  STORAGE_KEY_PROGRESS,
} from '../config/constants';
import { createDefaultProgress, type PlayerProgress } from '../types/PlayerProgress';
import type { MinigameResult } from '../types/MinigameResult';

/** Название коллекции PocketBase с анонимными "теневыми" пользователями. */
const USERS_COLLECTION = 'users';
/** Название коллекции PocketBase с прогрессом игроков. */
const PROGRESS_COLLECTION = 'progress';
/** Название коллекции PocketBase с результатами прохождения мини-игр. */
const MINIGAME_RESULTS_COLLECTION = 'minigame_results';

/** Форма данных, сохраняемых в localStorage для восстановления auth-сессии. */
interface StoredAuthToken {
  token: string;
  userId: string;
}

/**
 * Генерирует случайный пароль для анонимной "теневой" учётной записи.
 * Пароль нигде не показывается игроку — он нужен только для внутренней
 * авторизации в PocketBase.
 */
function generateShadowPassword(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

/**
 * Пытается восстановить ранее сохранённую сессию PocketBase из localStorage.
 * Возвращает id пользователя, если токен валиден, иначе null.
 */
async function tryRestoreSession(): Promise<string | null> {
  const stored = loadFromLocal<StoredAuthToken>(STORAGE_KEY_AUTH_TOKEN);
  if (stored === null) {
    return null;
  }
  try {
    pocketbaseClient.authStore.save(stored.token, null);
    // authRefresh() проверит токен на сервере и обновит данные модели.
    const result = await pocketbaseClient.collection(USERS_COLLECTION).authRefresh();
    return result.record.id;
  } catch (error) {
    console.error('[progressService] Не удалось восстановить сессию PocketBase:', error);
    pocketbaseClient.authStore.clear();
    removeFromLocal(STORAGE_KEY_AUTH_TOKEN);
    return null;
  }
}

/**
 * Создаёт новую анонимную "теневую" учётную запись в PocketBase и
 * авторизуется под ней. Используется, если у игрока ещё нет сохранённой
 * сессии (первый запуск игры на этом устройстве).
 */
async function createShadowAccount(): Promise<string> {
  const email = `${crypto.randomUUID()}@profpath.local`;
  const password = generateShadowPassword();

  await pocketbaseClient.collection(USERS_COLLECTION).create({
    email,
    password,
    passwordConfirm: password,
    emailVisibility: false,
  });

  const authResult = await pocketbaseClient
    .collection(USERS_COLLECTION)
    .authWithPassword(email, password);

  const storedToken: StoredAuthToken = {
    token: pocketbaseClient.authStore.token,
    userId: authResult.record.id,
  };
  saveToLocal(STORAGE_KEY_AUTH_TOKEN, storedToken);

  return authResult.record.id;
}

/**
 * Загружает запись прогресса из PocketBase по id пользователя.
 * Возвращает null, если запись ещё не создана или произошла ошибка сети.
 */
async function fetchRemoteProgress(userId: string): Promise<PlayerProgress | null> {
  try {
    const record = await pocketbaseClient
      .collection(PROGRESS_COLLECTION)
      .getFirstListItem(`user="${userId}"`);
    return {
      deviceId: userId,
      nickname: String(record.nickname ?? ''),
      currentChapter: Number(record.currentChapter ?? 0),
      completedMinigames: Array.isArray(record.completedMinigames)
        ? record.completedMinigames
        : [],
      stressProfile: record.stressProfile ?? { programmer: 0, builder: 0, medic: 0 },
    };
  } catch (error) {
    console.error('[progressService] Не удалось загрузить прогресс из PocketBase:', error);
    return null;
  }
}

/**
 * Создаёт начальную запись прогресса в PocketBase для нового игрока.
 */
async function createRemoteProgress(progress: PlayerProgress): Promise<void> {
  await pocketbaseClient.collection(PROGRESS_COLLECTION).create({
    user: progress.deviceId,
    nickname: progress.nickname,
    currentChapter: progress.currentChapter,
    completedMinigames: progress.completedMinigames,
    stressProfile: progress.stressProfile,
  });
}

/**
 * Гарантирует наличие активной сессии игрока: восстанавливает сохранённую
 * сессию PocketBase либо создаёт новую анонимную учётную запись, а затем
 * возвращает актуальный прогресс (из бэкенда, либо только что созданный).
 * @param nickname никнейм, введённый игроком на старте
 */
export async function ensurePlayerSession(nickname: string): Promise<PlayerProgress> {
  try {
    let userId = await tryRestoreSession();
    let isNewAccount = false;

    if (userId === null) {
      userId = await createShadowAccount();
      isNewAccount = true;
    }

    if (!isNewAccount) {
      const remoteProgress = await fetchRemoteProgress(userId);
      if (remoteProgress !== null) {
        const updatedProgress: PlayerProgress = { ...remoteProgress, nickname };
        saveToLocal(STORAGE_KEY_PROGRESS, updatedProgress);
        return updatedProgress;
      }
    }

    const freshProgress = createDefaultProgress(userId, nickname);
    try {
      await createRemoteProgress(freshProgress);
    } catch (error) {
      console.error('[progressService] Не удалось создать запись прогресса на бэкенде:', error);
    }
    saveToLocal(STORAGE_KEY_PROGRESS, freshProgress);
    return freshProgress;
  } catch (error) {
    console.error('[progressService] Сессия PocketBase недоступна, используем локальный fallback:', error);
    const fallback =
      loadFromLocal<PlayerProgress>(STORAGE_KEY_PROGRESS) ??
      createDefaultProgress(`local-${crypto.randomUUID()}`, nickname);
    fallback.nickname = nickname;
    saveToLocal(STORAGE_KEY_PROGRESS, fallback);
    return fallback;
  }
}

/**
 * Сохраняет прогресс игрока в PocketBase (upsert: сначала пробуем обновить
 * существующую запись, если её нет — создаём новую). При любой сетевой
 * ошибке прогресс всё равно сохраняется локально, чтобы не терять данные.
 * @param progress актуальное состояние прогресса игрока
 */
export async function saveProgress(progress: PlayerProgress): Promise<void> {
  saveToLocal(STORAGE_KEY_PROGRESS, progress);

  try {
    const existing = await pocketbaseClient
      .collection(PROGRESS_COLLECTION)
      .getFirstListItem(`user="${progress.deviceId}"`);

    await pocketbaseClient.collection(PROGRESS_COLLECTION).update(existing.id, {
      nickname: progress.nickname,
      currentChapter: progress.currentChapter,
      completedMinigames: progress.completedMinigames,
      stressProfile: progress.stressProfile,
    });
  } catch (updateError) {
    try {
      await createRemoteProgress(progress);
    } catch (createError) {
      console.error(
        '[progressService] Не удалось ни обновить, ни создать прогресс на бэкенде. ' +
          'Прогресс сохранён только локально:',
        createError,
      );
    }
  }
}

/**
 * Записывает результат прохождения мини-игры в коллекцию "minigame_results".
 * Если бэкенд недоступен, результат откладывается в локальную очередь и
 * будет отправлен при следующем успешном вызове этой функции.
 * @param result результат прохождения мини-игры
 */
export async function recordMinigameResult(result: MinigameResult): Promise<void> {
  await flushPendingMinigameResults();

  const progress = pocketbaseClient.authStore.record;
  const userId = progress?.id ?? loadFromLocal<StoredAuthToken>(STORAGE_KEY_AUTH_TOKEN)?.userId ?? 'unknown';

  try {
    await pocketbaseClient.collection(MINIGAME_RESULTS_COLLECTION).create({
      user: userId,
      minigameType: result.minigameType,
      score: result.score,
      attempts: result.attempts,
      stressLevel: result.stressLevel,
      difficulty: result.difficulty,
    });
  } catch (error) {
    console.error('[progressService] Не удалось отправить результат мини-игры, ставим в очередь:', error);
    const pending = loadFromLocal<MinigameResult[]>(STORAGE_KEY_PENDING_RESULTS) ?? [];
    pending.push(result);
    saveToLocal(STORAGE_KEY_PENDING_RESULTS, pending);
  }
}

/**
 * Пытается отправить все накопленные локально результаты мини-игр,
 * которые не удалось синхронизировать ранее из-за недоступности бэкенда.
 */
async function flushPendingMinigameResults(): Promise<void> {
  const pending = loadFromLocal<MinigameResult[]>(STORAGE_KEY_PENDING_RESULTS);
  if (pending === null || pending.length === 0) {
    return;
  }

  const userId = pocketbaseClient.authStore.record?.id ?? 'unknown';
  const stillPending: MinigameResult[] = [];

  for (const result of pending) {
    try {
      await pocketbaseClient.collection(MINIGAME_RESULTS_COLLECTION).create({
        user: userId,
        minigameType: result.minigameType,
        score: result.score,
        attempts: result.attempts,
        stressLevel: result.stressLevel,
        difficulty: result.difficulty,
      });
    } catch (error) {
      console.error('[progressService] Повторная синхронизация результата мини-игры не удалась:', error);
      stillPending.push(result);
    }
  }

  saveToLocal(STORAGE_KEY_PENDING_RESULTS, stillPending);
}

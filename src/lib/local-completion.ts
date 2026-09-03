import * as SecureStore from 'expo-secure-store';

const INDEX_KEY = 'grea_local_completed_courses';
const COURSE_KEY_PREFIX = 'grea_local_completed_';

function courseKey(courseId: number | string): string {
  return `${COURSE_KEY_PREFIX}${String(courseId)}`;
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String))];
}

async function readIds(key: string): Promise<string[]> {
  const stored = await SecureStore.getItemAsync(key);
  if (!stored) return [];

  try {
    return normalizeIds(JSON.parse(stored));
  } catch {
    return [];
  }
}

async function getCourseKeys(): Promise<string[]> {
  return (await readIds(INDEX_KEY)).map((id) => courseKey(id));
}

export async function getLocalCompletedIds(courseId: number | string): Promise<string[]> {
  return readIds(courseKey(courseId));
}

export async function recordLocalCompletion(courseId: number | string, itemId: number | string): Promise<void> {
  const normalizedCourseId = String(courseId);
  const ids = await getLocalCompletedIds(normalizedCourseId);
  ids.push(String(itemId));
  await SecureStore.setItemAsync(courseKey(normalizedCourseId), JSON.stringify([...new Set(ids)]));

  const courseIds = await readIds(INDEX_KEY);
  if (!courseIds.includes(normalizedCourseId)) {
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...courseIds, normalizedCourseId]));
  }
}

export async function removeLocalCompletion(courseId: number | string, itemId: number | string): Promise<void> {
  const normalizedCourseId = String(courseId);
  const ids = (await getLocalCompletedIds(normalizedCourseId)).filter((id) => id !== String(itemId));
  if (ids.length > 0) {
    await SecureStore.setItemAsync(courseKey(normalizedCourseId), JSON.stringify(ids));
  } else {
    await SecureStore.deleteItemAsync(courseKey(normalizedCourseId));
  }
}

export async function isLocallyCompleted(courseId: number | string, itemId: number | string): Promise<boolean> {
  const ids = await getLocalCompletedIds(courseId);
  return ids.includes(String(itemId));
}

export async function clearLocalCompletionData(): Promise<void> {
  const keys = await getCourseKeys();
  await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  await SecureStore.deleteItemAsync(INDEX_KEY);
}
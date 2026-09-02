import { router } from 'expo-router';

export type CurriculumItemLike = {
  id?: number | string;
  lesson_id?: number | string;
  quiz_id?: number | string;
  assignment_id?: number | string;
  project_id?: number | string;
  type?: string | null;
  title?: string | null;
  name?: string | null;
  completed?: boolean;
  items?: CurriculumItemLike[];
  [key: string]: unknown;
};

export function getCurriculumItemId(item?: CurriculumItemLike | null): number | string | null {
  if (!item) return null;
  const id = item.id ?? item.lesson_id ?? item.quiz_id ?? item.assignment_id ?? item.project_id;
  return id !== undefined && id !== null ? String(id) : null;
}

export function getCurriculumItemRoute(item?: CurriculumItemLike | null): string | null {
  if (!item) return null;
  const type = String(item.type || '').toLowerCase();
  const itemId = getCurriculumItemId(item);

  if (!itemId) return null;

  if (type === 'quiz') return '/quiz/[id]';
  if (type === 'assignment' || type === 'project') return '/assignment/[id]';
  return '/lesson/[id]';
}

export function flattenCurriculumItems(sections: any[] = []): CurriculumItemLike[] {
  const flattened: CurriculumItemLike[] = [];
  const seen = new Set<string>();

  const walk = (items: any[] = []) => {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const id = getCurriculumItemId(item);
      if (id) {
        const key = `${String(item.type || 'item')}:${id}`;
        if (!seen.has(key)) {
          seen.add(key);
          flattened.push(item);
        }
      }
      if (Array.isArray(item.items)) {
        walk(item.items);
      }
    }
  };

  for (const section of sections) {
    if (!section) continue;
    if (Array.isArray(section.items)) {
      walk(section.items);
    }
  }

  return flattened;
}

export function findFirstUnfinishedItem(sections: any[] = []): CurriculumItemLike | null {
  const items = flattenCurriculumItems(sections);
  return items.find((item) => !item.completed) ?? items[0] ?? null;
}

export function findCurriculumItemById(sections: any[] = [], targetId: number | string): CurriculumItemLike | null {
  const target = String(targetId);

  for (const item of flattenCurriculumItems(sections)) {
    const current = getCurriculumItemId(item);
    if (current !== null && String(current) === target) {
      return item;
    }
  }

  return null;
}

export function findNextCurriculumItem(sections: any[] = [], currentId: number | string): CurriculumItemLike | null {
  const items = flattenCurriculumItems(sections);
  const currentIndex = items.findIndex((item) => {
    const current = getCurriculumItemId(item);
    return current !== null && String(current) === String(currentId);
  });

  if (currentIndex === -1) {
    return items[0] ?? null;
  }

  return items[currentIndex + 1] ?? null;
}

export function getCurriculumNavigationTarget(item?: CurriculumItemLike | null): Parameters<typeof router.push>[0] | null {
  if (!item) return null;
  const route = getCurriculumItemRoute(item);
  const itemId = getCurriculumItemId(item);
  if (!route || !itemId) return null;
  return { pathname: route, params: { id: String(itemId) } } as Parameters<typeof router.push>[0];
}

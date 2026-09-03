import type { CourseSection, ProgressSummary } from '@/src/lib/api';

export type ReconciledCourseProgress = {
  completedIds: string[];
  completed: number;
  total: number;
  percentage: number;
  reconciledCurriculum: CourseSection[];
};

export function getProgressItemIds(item: any): string[] {
  return [item?.id, item?.lesson_id, item?.quiz_id, item?.assignment_id, item?.project_id, item?.progress_item_id]
    .filter((value) => value !== undefined && value !== null)
    .map(String);
}

function getServerCompletedIds(progress: ProgressSummary | null | undefined): string[] {
  return [progress?.completed_ids, progress?.completedIds].flatMap((ids) => (
    Array.isArray(ids)
      ? ids.map(String)
      : typeof ids === 'string'
        ? ids.split(',').map((value) => value.trim()).filter(Boolean)
        : []
  ));
}

function getCurriculumItems(sections: any[]): any[] {
  const items: any[] = [];
  const itemIds = new Map<string, any>();

  const visit = (entries: any[]) => {
    entries.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const ids = getProgressItemIds(item);
      const existing = ids.map((itemId) => itemIds.get(itemId)).find(Boolean);

      if (ids.length > 0 && !existing) {
        items.push(item);
        ids.forEach((itemId) => itemIds.set(itemId, item));
      } else if (existing && item.completed === true) {
        existing.completed = true;
      }

      if (Array.isArray(item.items)) visit(item.items);
    });
  };

  sections.forEach((section) => {
    if (Array.isArray(section?.items)) visit(section.items);
  });
  return items;
}

function reconcileEntries(entries: any[], completionIds: Set<string>): any[] {
  const seenIds = new Set<string>();
  return entries.filter((item) => {
    const ids = getProgressItemIds(item);
    if (ids.length === 0 || ids.every((itemId) => seenIds.has(itemId))) return ids.length === 0;
    ids.forEach((itemId) => seenIds.add(itemId));
    return true;
  }).map((item) => {
    if (!item || typeof item !== 'object') return item;
    const children = Array.isArray(item.items) ? reconcileEntries(item.items, completionIds) : item.items;
    const completed = item.completed === true || getProgressItemIds(item).some((itemId) => completionIds.has(itemId));
    return { ...item, ...(children ? { items: children } : {}), ...(completed ? { completed: true } : {}) };
  });
}

export function getReconciledCourseProgress({
  courseId,
  curriculum,
  progress,
  localCompletedIds = [],
  fallbackTotal,
}: {
  courseId?: number | string | null;
  curriculum: CourseSection[] | null | undefined;
  progress: ProgressSummary | null | undefined;
  localCompletedIds?: (number | string)[];
  fallbackTotal?: number | string | null;
}): ReconciledCourseProgress {
  const sections = Array.isArray(curriculum) ? curriculum : [];
  const completedIds = new Set([...getServerCompletedIds(progress), ...localCompletedIds.map(String)]);
  const items = getCurriculumItems(sections);

  items.forEach((item) => {
    if (item.completed === true) getProgressItemIds(item).forEach((itemId) => completedIds.add(itemId));
  });

  const reconciledCurriculum = reconcileEntries(sections, completedIds) as CourseSection[];
  const completed = items.filter((item) => item.completed === true || getProgressItemIds(item).some((itemId) => completedIds.has(itemId))).length;
  const total = items.length > 0 ? items.length : Number(fallbackTotal ?? progress?.total_items ?? progress?.total_count ?? 0);

  if (__DEV__) {
    console.log('[GREA GLOBAL PROGRESS]', {
      courseId,
      serverCompletedCount: getServerCompletedIds(progress).length,
      localCompletedCount: localCompletedIds.length,
      reconciledCompleted: completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  return {
    completedIds: [...completedIds],
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    reconciledCurriculum,
  };
}

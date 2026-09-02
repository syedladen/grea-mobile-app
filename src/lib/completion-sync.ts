import {
    apiGetCurriculumFresh,
    apiGetLessonFresh,
    apiGetProgressFresh,
    type CourseSection,
    type LessonResponse,
    type ProgressSummary,
} from '@/src/lib/api';

export type CompletionVerificationSource = 'lesson' | 'curriculum' | 'progress' | null;

export type VerifyItemCompletionOptions = {
  itemId: number | string;
  courseId?: number | string | null;
  token: string;
  itemType?: string | null;
};

export type VerifyItemCompletionResult = {
  completed: boolean;
  source: CompletionVerificationSource;
  lesson?: LessonResponse | null;
  curriculum?: CourseSection[];
  progress?: ProgressSummary | null;
};

function matchesItemId(item: Record<string, unknown> | null | undefined, targetId: number | string): boolean {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const currentId = item.id ?? item.lesson_id ?? item.quiz_id ?? item.assignment_id ?? item.project_id;
  return currentId !== undefined && currentId !== null && String(currentId) === String(targetId);
}

export function curriculumContainsCompletedItem(sections: CourseSection[] | null | undefined, targetId: number | string): boolean {
  if (!Array.isArray(sections)) {
    return false;
  }

  const stack: Record<string, unknown>[] = [...sections] as Record<string, unknown>[];

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || typeof item !== 'object') {
      continue;
    }

    if (matchesItemId(item, targetId) && Boolean(item.completed)) {
      return true;
    }

    if (Array.isArray(item.items)) {
      stack.push(...(item.items as Record<string, unknown>[]));
    }
  }

  return false;
}

export function progressContainsCompletedItem(progress: ProgressSummary | null | undefined, targetId: number | string): boolean {
  if (!progress || typeof progress !== 'object') {
    return false;
  }

  const record = progress as Record<string, unknown>;
  const completedIds = record.completed_ids ?? record.completedIds ?? record.completed_id ?? record.completedIdsList;

  if (Array.isArray(completedIds)) {
    return completedIds.some((value) => String(value) === String(targetId));
  }

  if (typeof completedIds === 'string') {
    return completedIds.split(',').map((value) => value.trim()).includes(String(targetId));
  }

  if (typeof (record.completed) === 'boolean') {
    return Boolean(record.completed);
  }

  return false;
}

export async function verifyItemCompletion({
  itemId,
  courseId,
  token,
  itemType,
}: VerifyItemCompletionOptions): Promise<VerifyItemCompletionResult> {
  const normalizedItemId = String(itemId);
  const shouldCheckLesson = !itemType || ['lesson', 'lesson_item', 'item'].includes(String(itemType).toLowerCase());

  const [lessonResponse, curriculumResponse, progressResponse] = await Promise.all([
    shouldCheckLesson ? apiGetLessonFresh(itemId, token) : Promise.resolve(null),
    courseId ? apiGetCurriculumFresh(courseId, token) : Promise.resolve([] as CourseSection[]),
    courseId ? apiGetProgressFresh(courseId, token) : Promise.resolve(null),
  ]);

  if (lessonResponse?.completed === true) {
    return {
      completed: true,
      source: 'lesson',
      lesson: lessonResponse,
      curriculum: curriculumResponse,
      progress: progressResponse,
    };
  }

  if (courseId && curriculumContainsCompletedItem(curriculumResponse, normalizedItemId)) {
    return {
      completed: true,
      source: 'curriculum',
      lesson: lessonResponse,
      curriculum: curriculumResponse,
      progress: progressResponse,
    };
  }

  if (courseId && progressContainsCompletedItem(progressResponse, normalizedItemId)) {
    return {
      completed: true,
      source: 'progress',
      lesson: lessonResponse,
      curriculum: curriculumResponse,
      progress: progressResponse,
    };
  }

  return {
    completed: false,
    source: null,
    lesson: lessonResponse,
    curriculum: curriculumResponse,
    progress: progressResponse,
  };
}

export async function verifyItemCompletionWithRetry({
  itemId,
  courseId,
  token,
  itemType,
  delays = [0, 250, 750, 1500, 3000],
}: VerifyItemCompletionOptions & { delays?: number[] }): Promise<VerifyItemCompletionResult & { attempt: number }> {
  let lastResult: VerifyItemCompletionResult & { attempt: number } = {
    completed: false,
    source: null,
    attempt: 0,
  };

  for (let index = 0; index < delays.length; index += 1) {
    const delay = delays[index] ?? 0;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const result = await verifyItemCompletion({ itemId, courseId, token, itemType });
    lastResult = { ...result, attempt: index + 1 };

    if (__DEV__) {
      const lessonCompleted = Boolean(result.lesson?.completed);
      const curriculumCompleted = Boolean(
        Array.isArray(result.curriculum) && curriculumContainsCompletedItem(result.curriculum, String(itemId)),
      );
      const progressCompleted = Boolean(
        courseId && progressContainsCompletedItem(result.progress, String(itemId)),
      );

      console.log('[GREA COMPLETION VERIFY]', JSON.stringify({
        itemId: String(itemId),
        attempt: index + 1,
        lessonCompleted,
        curriculumCompleted,
        progressCompleted,
        acceptedSource: result.source,
      }, null, 2));
    }

    if (result.completed) {
      return lastResult;
    }
  }

  return lastResult;
}

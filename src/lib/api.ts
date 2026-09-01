import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = 'https://globalrealestateacademy.org/wp-json/grea-mobile/v1';

export type ApiMeta = {
  message?: string;
  [key: string]: unknown;
};

export type ApiError = Error & {
  status?: number;
  body?: unknown;
};

export type User = {
  id?: number;
  name?: string;
  email?: string;
  username?: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
};

export type CourseItem = {
  id?: number;
  title?: string;
  name?: string;
  type?: string;
  completed?: boolean;
  completed_items?: number;
  total_items?: number;
  progress?: number;
  has_access?: boolean;
  enroll_status?: string;
  course_id?: number;
  item_id?: number;
  quiz_id?: number;
  lesson_id?: number;
  assignment_id?: number;
  project_id?: number;
  content?: string;
  excerpt?: string;
  slug?: string;
  status?: string;
  next_id?: number | null;
  next_type?: string | null;
  previous_id?: number | null;
  previous_type?: string | null;
  items?: CourseItem[];
};

export type CourseSection = {
  id?: number;
  title?: string;
  name?: string;
  items?: CourseItem[];
  completed?: boolean;
  menu_order?: number;
};

export type Course = {
  id?: number;
  title?: string;
  name?: string;
  description?: string;
  content?: string;
  progress?: number;
  completed_items?: number;
  total_items?: number;
  student?: { name?: string };
  enrolled?: boolean;
  available?: boolean;
  status?: string;
};

export type LessonResponse = {
  id?: number;
  title?: string;
  content?: string;
  html?: string;
  body?: string;
  type?: string;
  completed?: boolean;
  next_id?: number | null;
  next_type?: string | null;
  previous_id?: number | null;
  previous_type?: string | null;
  lesson_id?: number;
  assignment_id?: number;
  project_id?: number;
  quiz_id?: number;
};

export type QuizQuestion = {
  id?: number | string;
  question?: string;
  title?: string;
  prompt?: string;
  choices?: Array<{
    id?: number | string;
    label?: string;
    text?: string;
    value?: string;
    description?: string;
  }>;
  answers?: Array<{ id?: number | string; text?: string; value?: string }>;
};

export type QuizResponse = {
  id?: number;
  title?: string;
  name?: string;
  questions?: QuizQuestion[];
  pass_mark?: number;
  pass_mark_percent?: number;
  pass_mark_percentage?: number;
  score?: number;
  total_questions?: number;
  submission?: {
    score?: number;
    passed?: boolean;
    pass_mark?: number;
    total_questions?: number;
    answers?: Record<string, string[]>;
  };
};

export type AssignmentFile = {
  index?: number;
  name?: string;
  size?: number;
  ext?: string;
  download_url?: string;
  url?: string;
  [key: string]: unknown;
};

export type AssignmentLimits = {
  max_score?: number;
  pass_score?: number;
  max_files?: number;
  max_mb?: number;
  allowed_exts?: string[];
  due?: string | null;
  [key: string]: unknown;
};

export type AssignmentSubmission = {
  id?: number;
  status?: string;
  text?: string;
  content?: string;
  files?: AssignmentFile[];
  score?: number | null;
  max_score?: number | null;
  feedback?: string | null;
  submitted_at?: string | null;
  graded_at?: string | null;
  updated_at?: string | null;
  can_submit?: boolean;
  limits?: AssignmentLimits | null;
  submitted?: boolean;
  [key: string]: unknown;
};

export type AssignmentSubmissionResponse = {
  assignment_id?: number | string;
  course_id?: number | string;
  status?: string;
  can_submit?: boolean;
  limits?: AssignmentLimits;
  submission?: AssignmentSubmission | null;
  [key: string]: unknown;
};

export function normalizeAssignmentSubmission(response: unknown): AssignmentSubmission | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const record = response as Record<string, unknown>;
  const candidate = record.submission && typeof record.submission === 'object' ? (record.submission as Record<string, unknown>) : record;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const hasSubmissionData = [
    'id',
    'status',
    'text',
    'content',
    'files',
    'score',
    'max_score',
    'feedback',
    'submitted_at',
    'graded_at',
    'updated_at',
    'can_submit',
    'limits',
    'submitted',
  ].some((key) => key in candidate && candidate[key] !== undefined);

  if (!hasSubmissionData) {
    return null;
  }

  return candidate as AssignmentSubmission;
}

export type ProgressSummary = {
  course_id?: number;
  courseId?: number;
  progress?: number;
  percentage?: number;
  completed_items?: number;
  total_items?: number;
  completed_count?: number;
  total_count?: number;
};

export type MasteriyoSyncState = {
  masteriyo_synced?: boolean;
  masteriyo_error?: string | null;
  masteriyo?: {
    synced?: boolean;
    error?: string | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type CompletionApiResponse = {
  message?: string;
  completed?: boolean;
  course_id?: number | string;
  courseId?: number | string;
  progress?: Record<string, unknown> | ProgressSummary | null;
  sync?: MasteriyoSyncState | null;
  [key: string]: unknown;
};

export type QuizSubmissionResult = {
  score?: number;
  pass?: boolean;
  passed?: boolean;
  message?: string;
  result?: { pass?: boolean; score?: number; [key: string]: unknown };
  sync?: MasteriyoSyncState | null;
  progress?: Record<string, unknown> | ProgressSummary | null;
  course_id?: number | string;
  courseId?: number | string;
  attempt_sync?: boolean | null;
  completion_sync?: boolean | null;
  [key: string]: unknown;
};

const TOKEN_KEY = 'grea_token';

function safeSyncLogPayload(payload: unknown): { sync?: unknown; progress?: unknown } {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const record = payload as Record<string, unknown>;
  return {
    sync: record.sync,
    progress: record.progress,
  };
}

export function extractMasteriyoError(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Unknown backend error';
  }

  const record = payload as Record<string, unknown>;
  const sync = record.sync as Record<string, unknown> | undefined;
  if (sync) {
    const masteriyo = (sync.masteriyo as Record<string, unknown> | null | undefined) ?? null;
    const candidates = [
      sync.masteriyo_error,
      sync.masteriyoError,
      masteriyo?.error,
      masteriyo?.message,
      sync.error,
      masteriyo?.message,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  const message = record.message;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  return 'Unknown backend error';
}

function extractCourseId(payload: unknown): number | string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.course_id,
    record.courseId,
    record.progress && typeof record.progress === 'object' ? (record.progress as Record<string, unknown>).course_id : undefined,
    record.progress && typeof record.progress === 'object' ? (record.progress as Record<string, unknown>).courseId : undefined,
    record.sync && typeof record.sync === 'object' && 'course_id' in (record.sync as Record<string, unknown>) ? (record.sync as Record<string, unknown>).course_id : undefined,
    record.sync && typeof record.sync === 'object' && 'courseId' in (record.sync as Record<string, unknown>) ? (record.sync as Record<string, unknown>).courseId : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
  }

  return null;
}

export function isMasteriyoSyncFailure(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const sync = record.sync as Record<string, unknown> | undefined;
  const attemptSync = record.attempt_sync as Record<string, unknown> | undefined;
  const completionSync = record.completion_sync as Record<string, unknown> | undefined;
  const syncMasteriyo = (sync?.masteriyo as Record<string, unknown> | null | undefined) ?? null;
  const completionMasteriyo = (completionSync?.masteriyo as Record<string, unknown> | null | undefined) ?? null;

  const candidates = [
    sync?.masteriyo_synced,
    syncMasteriyo?.synced,
    completionSync?.masteriyo_synced,
    completionMasteriyo?.synced,
    completionSync?.synced,
    attemptSync?.grea_lms_synced,
    attemptSync?.greaLmsSynced,
    attemptSync?.synced,
  ];

  return candidates.some((value) => value === false);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function decodeHtmlEntities(value?: string | null): string {
  if (!value) return '';

  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#038;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#8217;/gi, "'")
    .replace(/&#8216;/gi, "'")
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"')
    .replace(/&#8211;/gi, '-')
    .replace(/&#8212;/gi, '—')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x26;/gi, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

export function stripHtmlTags(value?: string | null): string {
  return decodeHtmlEntities(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanDisplayText(value?: string | null): string {
  return stripHtmlTags(value);
}

export function sanitizeContentForNative(html?: string | null): string {
  if (!html) return '';

  let cleaned = decodeHtmlEntities(html);

  cleaned = cleaned.replace(/<!--\s*GREA_ASSIGNMENT_LINK_START\s*-->[\s\S]*?<!--\s*GREA_ASSIGNMENT_LINK_END\s*-->/gi, '');
  cleaned = cleaned.replace(/<!--.*?-->/g, '');
  cleaned = cleaned.replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<button[\s\S]*?<\/button>/gi, '');
  cleaned = cleaned.replace(/<a\s+[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*(grea-assignment-launch|assignment-launch)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<p\s*><\/p>/gi, '');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/?(strong|b|em|i|u|span|li|ul|ol|h[1-6]|p|div|section|article|main|blockquote|figure|figcaption)>/gi, '');
  cleaned = cleaned.replace(/<\/?(meta|head|html|body)>/gi, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\s+\n/g, '\n');

  return cleaned.trim();
}

export function normalizedTitle(value?: string | null): string {
  return cleanDisplayText(value).toLowerCase();
}

export function deduplicateSectionItems(items: Array<Record<string, any>> = []): Array<Record<string, any>> {
  const seenIds = new Set<string>();
  const uniqueItems: Array<Record<string, any>> = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const id = item.id ?? item.lesson_id ?? item.quiz_id ?? item.assignment_id ?? item.project_id;
    const idKey = id !== undefined && id !== null ? String(id) : null;

    if (idKey !== null) {
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);
    }

    uniqueItems.push({
      ...item,
      title: cleanDisplayText(item.title ?? item.name ?? ''),
      name: cleanDisplayText(item.name ?? item.title ?? ''),
    });
  }

  return uniqueItems;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Something went wrong. Please try again.';
}

export function normalizeNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function normalizeProgress(raw: unknown): number {
  const value = normalizeNumberValue(raw, 0);
  return Math.min(100, Math.max(0, value));
}

export function getApiHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-GREA-Token'] = token;
  }

  return headers;
}

function formatFormDataHeaders(headers: Record<string, string>, body: BodyInit | null | undefined): Record<string, string> {
  const nextHeaders = { ...headers };
  if (body instanceof FormData) {
    delete nextHeaders['Content-Type'];
  }
  return nextHeaders;
}

function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${normalized}`;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const baseHeaders = {
    ...getApiHeaders(token),
    ...(options.headers ? (options.headers as Record<string, string>) : {}),
  };
  const headers = formatFormDataHeaders(baseHeaders, options.body);

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error((body && (body.message || body.error || 'Request failed')) || 'Request failed');
    Object.assign(error, { status: response.status, body });
    throw error;
  }

  return body as T;
}

export async function apiLogin(identifier: string, password: string): Promise<{ token?: string; user?: User; message?: string }> {
  const payload = await request<{ token?: string; user?: User; message?: string }>('auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });

  if (payload.token) {
    await setStoredToken(payload.token);
  }

  return payload;
}

export async function apiRegister(name: string, email: string, password: string): Promise<{ token?: string; user?: User; message?: string }> {
  const payload = await request<{ token?: string; user?: User; message?: string }>('auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  if (payload.token) {
    await setStoredToken(payload.token);
  }

  return payload;
}

export async function apiLogout(token?: string | null): Promise<{ message?: string }> {
  return request<{ message?: string }>('auth/logout', { method: 'POST' }, token);
}

export async function apiGetMe(token?: string | null): Promise<{ user?: User; data?: User; [key: string]: unknown }> {
  const payload = await request<{ user?: User; data?: User; [key: string]: unknown }>('me', {}, token);

  if (!payload.user && payload.data && typeof payload.data === 'object') {
    return { ...payload, user: payload.data as User };
  }

  return payload;
}

export async function apiGetCourses(token?: string | null): Promise<Course[]> {
  const payload = await request<{ courses?: Course[]; data?: Course[]; items?: Course[]; [key: string]: unknown }>('courses', {}, token);
  console.log('[grea] raw /courses response', payload);

  if (Array.isArray(payload)) return payload as Course[];
  if (Array.isArray(payload.courses)) return payload.courses;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export async function apiGetCourse(courseId: number | string, token?: string | null): Promise<Course | null> {
  const payload = await request<Course | { data?: Course; course?: Course }>(`courses/${courseId}`, {}, token);

  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as Course;
  }

  if (payload && typeof payload === 'object' && 'course' in payload && payload.course) {
    return payload.course as Course;
  }

  return payload as Course;
}

export async function apiGetCurriculum(courseId: number | string, token?: string | null): Promise<CourseSection[]> {
  const payload = await request<{ curriculum?: CourseSection[]; items?: CourseSection[]; data?: CourseSection[]; [key: string]: unknown }>(`courses/${courseId}/curriculum`, {}, token);
  console.log('[grea] raw /courses/{id}/curriculum response', payload);

  if (Array.isArray(payload)) return payload as CourseSection[];
  if (Array.isArray(payload.curriculum)) return payload.curriculum;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export async function apiGetLesson(lessonId: number | string, token?: string | null): Promise<LessonResponse | null> {
  const payload = await request<LessonResponse | { data?: LessonResponse; lesson?: LessonResponse }>(`lessons/${lessonId}`, {}, token);

  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as LessonResponse;
  }

  if (payload && typeof payload === 'object' && 'lesson' in payload && payload.lesson) {
    return payload.lesson as LessonResponse;
  }

  return payload as LessonResponse;
}

export async function apiCompleteLesson(lessonId: number | string, token?: string | null): Promise<CompletionApiResponse> {
  const payload = await request<CompletionApiResponse>(`lessons/${lessonId}/complete`, { method: 'POST' }, token);
  console.log('[grea] complete lesson response', payload);
  console.log('[grea] lesson sync response', safeSyncLogPayload(payload));
  return payload;
}

export async function apiGetQuiz(quizId: number | string, token?: string | null): Promise<QuizResponse | null> {
  const payload = await request<QuizResponse | { data?: QuizResponse; quiz?: QuizResponse }>(`quizzes/${quizId}`, {}, token);

  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as QuizResponse;
  }

  if (payload && typeof payload === 'object' && 'quiz' in payload && payload.quiz) {
    return payload.quiz as QuizResponse;
  }

  return payload as QuizResponse;
}

export async function apiSubmitQuiz(
  quizId: number | string,
  answers: Record<string, string[]>,
  token?: string | null,
): Promise<QuizSubmissionResult> {
  const payload = await request<QuizSubmissionResult>(
    `quizzes/${quizId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
    token,
  );

  console.log('[grea] quiz submit response', payload);
  console.log('[grea] quiz attempt sync', payload.attempt_sync);
  console.log('[grea] quiz completion sync', payload.completion_sync);
  console.log('[grea] quiz sync response', safeSyncLogPayload(payload));

  return payload;
}

export async function apiGetAssignmentSubmission(
  assignmentId: number | string,
  token?: string | null,
  cacheBust?: number | string,
): Promise<AssignmentSubmissionResponse | null> {
  const suffix = cacheBust !== undefined ? `?_ts=${encodeURIComponent(String(cacheBust))}` : '';
  const payload = await request<AssignmentSubmissionResponse | { data?: AssignmentSubmissionResponse; submission?: AssignmentSubmissionResponse }>(`assignments/${assignmentId}/submission${suffix}`, {}, token);

  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as AssignmentSubmissionResponse;
  }

  if (payload && typeof payload === 'object' && 'submission' in payload && payload.submission) {
    return payload.submission as AssignmentSubmissionResponse;
  }

  if (payload && typeof payload === 'object' && ('status' in payload || 'assignment_id' in payload || 'submission' in payload)) {
    return payload as AssignmentSubmissionResponse;
  }

  return payload as AssignmentSubmissionResponse;
}

export async function apiSubmitAssignment(
  assignmentId: number | string,
  text: string,
  files: Array<{ uri: string; name: string; type?: string }>,
  token?: string | null,
): Promise<{ message?: string; submitted?: boolean; id?: number; [key: string]: unknown }> {
  const formData = new FormData();

  if (text && text.trim()) {
    formData.append('text', text.trim());
  }

  files.forEach((file, index) => {
    const fileName = file.name || `upload-${index + 1}`;
    const fileType = file.type || 'application/octet-stream';
    formData.append(`file_${index + 1}`, {
      uri: file.uri,
      name: fileName,
      type: fileType,
    } as any);
  });

  return request<{ message?: string; submitted?: boolean; id?: number; [key: string]: unknown }>(
    `assignments/${assignmentId}/submit`,
    {
      method: 'POST',
      body: formData,
    },
    token,
  );
}

export async function apiGetProgress(courseId: number | string, token?: string | null): Promise<ProgressSummary | null> {
  const payload = await request<ProgressSummary | { data?: ProgressSummary; progress?: ProgressSummary }>(`progress/${courseId}`, {}, token);
  console.log('[grea] raw /progress/{id} response', payload);

  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as ProgressSummary;
  }

  if (payload && typeof payload === 'object' && 'progress' in payload && payload.progress) {
    return payload.progress as ProgressSummary;
  }

  return payload as ProgressSummary;
}

export function getItemType(name?: string): string {
  return (name || '').toLowerCase();
}

export function getCourseProgress(course?: Course | null): number {
  const raw = course?.progress ?? course?.completed_items ?? 0;
  if (typeof raw === 'number') {
    return normalizeProgress(raw);
  }

  if (typeof course?.completed_items === 'number' && typeof course?.total_items === 'number') {
    const total = Math.max(course.total_items || 1, 1);
    return Number(((course.completed_items / total) * 100).toFixed(0));
  }

  return 0;
}

export function getProgressValue(summary?: ProgressSummary | null): number {
  if (!summary) return 0;

  const value = summary.progress ?? summary.percentage ?? 0;
  if (typeof value === 'number') {
    return normalizeProgress(value);
  }

  const completed = normalizeNumberValue(summary.completed_items ?? summary.completed_count, 0);
  const total = normalizeNumberValue(summary.total_items ?? summary.total_count, 0);

  if (total > 0) {
    return Math.min(100, Math.max(0, Number(((completed / total) * 100).toFixed(0))));
  }

  return 0;
}

export function resolveDisplayName(user?: User | null): string {
  if (!user) return 'Student';
  return decodeHtmlEntities(user.name || user.display_name || user.first_name || user.username || 'Student');
}

export function resolveAvatarUrl(user?: User | null): string | undefined {
  if (!user) return undefined;
  if (typeof user.avatar === 'string' && user.avatar.length > 0) {
    return user.avatar;
  }

  return undefined;
}

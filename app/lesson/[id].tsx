import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import {
    apiCompleteLesson,
    apiGetCurriculumFresh,
    apiGetLessonFresh,
    apiGetProgressFresh,
    decodeHtmlEntities,
    getErrorMessage,
    getStoredToken,
    isMasteriyoSyncFailure,
} from '@/src/lib/api';
import { verifyItemCompletionWithRetry } from '@/src/lib/completion-sync';

export default function LessonScreen() {
  const { t, isRTL } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');
  const retryableFailureText = t('completionPending');
  const retryButtonText = t('checkAgain');
  const requestVersionRef = useRef(0);

  const loadLesson = useCallback(async () => {
    const token = await getStoredToken();
    if (!token || !id) {
      router.replace('/login');
      return;
    }

    const version = ++requestVersionRef.current;

    try {
      const data = await apiGetLessonFresh(id, token);
      if (version !== requestVersionRef.current) return;
      setLesson(data);
      setError('');
    } catch (err) {
      if (version !== requestVersionRef.current) return;
      setError(getErrorMessage(err));
    } finally {
      if (version === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadLesson();
      const interval = setInterval(() => {
        void loadLesson();
      }, 8000);
      return () => clearInterval(interval);
    }, [loadLesson]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void loadLesson();
      }
    });

    return () => subscription.remove();
  }, [loadLesson]);

  const reconcileAcceptedCompletion = useCallback(async (token: string, courseId?: number | string | null, refreshedLesson?: any) => {
    const finalLesson = refreshedLesson ?? (await apiGetLessonFresh(id as string, token).catch(() => null));
    if (finalLesson?.completed === true) {
      setLesson(finalLesson);
      setError('');
    }

    if (courseId) {
      await Promise.all([
        apiGetProgressFresh(courseId, token).catch(() => null),
        apiGetCurriculumFresh(courseId, token).catch(() => []),
      ]);
    }
  }, [id]);

  const handleCheckAgain = useCallback(async () => {
    const token = await getStoredToken();
    if (!token || !id || marking) return;

    const courseId = lesson?.course_id ?? lesson?.courseId;
    setError('');

    try {
      const verification = await verifyItemCompletionWithRetry({
        itemId: id,
        courseId,
        token,
        itemType: 'lesson',
        delays: [0, 250, 750, 1500, 3000],
      });

      if (verification.completed) {
        const finalLesson = verification.lesson ?? await apiGetLessonFresh(id, token).catch(() => null);
        if (finalLesson) {
          setLesson(finalLesson);
        }
        setError('');
        if (courseId) {
          await Promise.all([
            apiGetProgressFresh(courseId, token).catch(() => null),
            apiGetCurriculumFresh(courseId, token).catch(() => []),
          ]);
        }
        return;
      }

      setError(retryableFailureText);
    } catch (err) {
      if (__DEV__) {
        console.warn('Lesson completion check again failed.', err);
      }
      setError(retryableFailureText);
    }
  }, [id, lesson?.course_id, lesson?.courseId, marking, retryableFailureText]);

  const handleRetry = () => {
    if (!marking) {
      void handleCheckAgain();
    }
  };

  async function handleComplete() {
    const token = await getStoredToken();
    if (!token || !id || marking) return;

    try {
      setMarking(true);
      setError('');

      const result = await apiCompleteLesson(id, token);
      const syncFailed = isMasteriyoSyncFailure(result);
      const courseId = result.course_id ?? result.courseId ?? lesson?.course_id ?? lesson?.courseId;

      if (!syncFailed) {
        await reconcileAcceptedCompletion(token, courseId, await apiGetLessonFresh(id, token).catch(() => null));
        return;
      }

      if (__DEV__) {
        console.warn('Lesson completion sync observed; verifying final server state.', result);
      }

      const verification = await verifyItemCompletionWithRetry({
        itemId: id,
        courseId,
        token,
        itemType: 'lesson',
        delays: [250, 750, 1500, 3000],
      });

      if (verification.completed) {
        const finalLesson = verification.lesson ?? await apiGetLessonFresh(id, token).catch(() => null);
        if (finalLesson) {
          setLesson(finalLesson);
        }
        setError('');
        if (courseId) {
          await Promise.all([
            apiGetProgressFresh(courseId, token).catch(() => null),
            apiGetCurriculumFresh(courseId, token).catch(() => []),
          ]);
        }
        return;
      }

      if (__DEV__) {
        console.warn('Lesson completion could not be confirmed after GET verification.', verification);
      }

      setError(retryableFailureText);
    } catch (err) {
      if (__DEV__) {
        console.log('[LESSON COMPLETE ERROR]', JSON.stringify({
          status: (err as any)?.status,
          body: (err as any)?.body,
        }, null, 2));
      }

      const courseId = lesson?.course_id ?? lesson?.courseId;
      const verification = await verifyItemCompletionWithRetry({
        itemId: id,
        courseId,
        token,
        itemType: 'lesson',
        delays: [250, 750, 1500, 3000],
      });
      const verifiedLessonState = verification.lesson as any;
      const resolvedCourseId =
        verifiedLessonState?.course_id ??
        verifiedLessonState?.courseId ??
        lesson?.course_id ??
        lesson?.courseId ??
        null;

      if (__DEV__) {
        console.log('[LESSON VERIFY GET]', JSON.stringify({
          id,
          course_id: resolvedCourseId,
          completed: verification.lesson?.completed,
        }, null, 2));
      }

      if (verification.completed) {
        const finalLesson = verification.lesson ?? await apiGetLessonFresh(id, token).catch(() => null);
        if (finalLesson) {
          setLesson(finalLesson);
        }
        setError('');
        if (resolvedCourseId) {
          await Promise.all([
            apiGetProgressFresh(resolvedCourseId, token).catch(() => null),
            apiGetCurriculumFresh(resolvedCourseId, token).catch(() => []),
          ]);
        }
        return;
      }

      if (resolvedCourseId) {
        const [progressResult, curriculumResult] = await Promise.all([
          apiGetProgressFresh(resolvedCourseId, token).catch(() => null),
          apiGetCurriculumFresh(resolvedCourseId, token).catch(() => []),
        ]);

        if (__DEV__) {
          console.log('[LESSON VERIFY PROGRESS]', JSON.stringify(progressResult, null, 2));
          const match = Array.isArray(curriculumResult)
            ? curriculumResult.flatMap((section: any) => Array.isArray(section?.items) ? section.items : []).find((item: any) => {
                const candidateId = item?.id ?? item?.lesson_id ?? item?.quiz_id ?? item?.assignment_id ?? item?.project_id;
                return String(candidateId) === String(id);
              })
            : null;
          console.log('[LESSON VERIFY CURRICULUM ITEM]', JSON.stringify(match, null, 2));
        }
      }

      setError(retryableFailureText);
    } finally {
      setMarking(false);
    }
  }

  const articleContent = lesson?.content || lesson?.html || lesson?.body || '';
  const contentWidth = width - 40;

  const goToNode = (nextType: string | null | undefined, nextId?: number | string | null) => {
    if (!nextId) return;
    const path = nextType === 'quiz' ? '/quiz/[id]' : nextType === 'assignment' || nextType === 'project' ? '/assignment/[id]' : '/lesson/[id]';
    router.push({ pathname: path, params: { id: String(nextId) } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.homeButton}>
          <Ionicons name="home" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{decodeHtmlEntities(lesson?.title || t('lesson'))}</Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
              {error === retryableFailureText ? (
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry} disabled={marking}>
                  <Text style={styles.retryButtonText}>{retryButtonText}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {lesson ? (
            <>
              <RenderHTML
                contentWidth={contentWidth}
                source={{ html: articleContent || `<p>${t('noItemsInSection')}</p>` }}
                baseStyle={{
                  color: theme.colors.text,
                  fontSize: 16,
                  lineHeight: 28,
                }}
                tagsStyles={{
                  p: { color: theme.colors.text, marginBottom: 12 },
                  h1: { color: theme.colors.text, fontSize: 28, marginBottom: 12 },
                  h2: { color: theme.colors.text, fontSize: 24, marginBottom: 10 },
                  h3: { color: theme.colors.text, fontSize: 20, marginBottom: 10 },
                  ul: { marginLeft: 18, marginBottom: 12 },
                  li: { color: theme.colors.text, marginBottom: 6 },
                  a: { color: theme.colors.gold },
                  strong: { color: theme.colors.text },
                }}
                systemFonts={['System']}
              />

              <View style={styles.actionRow}>
                {lesson?.completed ? (
                  <View style={styles.completedPill}><Text style={styles.completedText}>{t('completed')}</Text></View>
                ) : (
                  <TouchableOpacity style={styles.primaryButton} onPress={handleComplete} disabled={marking}>
                    <Text style={styles.primaryButtonText}>{marking ? t('saving') : t('markComplete')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : null}

          <View style={styles.navRow}>
            {lesson?.previous_id ? (
              <TouchableOpacity style={styles.navButton} onPress={() => goToNode(lesson.previous_type, lesson.previous_id)}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                <Text style={styles.navText}>{t('previous')}</Text>
              </TouchableOpacity>
            ) : <View style={styles.navPlaceholder} />}

            {lesson?.next_id ? (
              <TouchableOpacity style={styles.navButtonPrimary} onPress={() => goToNode(lesson.next_type, lesson.next_id)}>
                <Text style={styles.navTextPrimary}>{t('next')}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.background} />
              </TouchableOpacity>
            ) : <View style={styles.navPlaceholder} />}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  homeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 18,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 8,
  },
  completedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#163726',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2F5D47',
  },
  completedText: {
    color: theme.colors.success,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#2A1418',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5A2A2A',
    gap: 10,
  },
  error: {
    color: theme.colors.danger,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.gold,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: theme.colors.background,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    minHeight: 48,
  },
  navButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  navText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  navTextPrimary: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  navPlaceholder: {
    flex: 1,
  },
});

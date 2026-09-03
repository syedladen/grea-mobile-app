import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import { apiGetCoursesFresh, apiGetCurriculumFresh, apiGetMe, apiGetProgressFresh, decodeHtmlEntities, getErrorMessage, getStoredToken, resolveDisplayName } from '@/src/lib/api';
import { getReconciledCourseProgress } from '@/src/lib/course-progress';
import { findFirstUnfinishedItem, getCurriculumNavigationTarget } from '@/src/lib/curriculum-navigation';
import { getLocalCompletedIds } from '@/src/lib/local-completion';

export default function HomeScreen() {
  const { t, language, isRTL } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingNext, setResolvingNext] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const [me, courseList] = await Promise.all([apiGetMe(token), apiGetCoursesFresh(token, language)]);
      const meUser = (me.user ?? me.data ?? me) as any;
      const enrolledCourses = Array.isArray(courseList) ? courseList : [];
      const reconciledCourses = await Promise.all(enrolledCourses.map(async (course: any) => {
        const courseId = course.id ?? course.course_id;
        const [curriculum, progress, localCompletedIds] = await Promise.all([
          apiGetCurriculumFresh(courseId, token, language).catch(() => null),
          apiGetProgressFresh(courseId, token).catch(() => null),
          getLocalCompletedIds(courseId).catch(() => []),
        ]);
        const reconciled = getReconciledCourseProgress({ courseId, curriculum, progress, localCompletedIds, fallbackTotal: course.total_items });
        return { ...course, ...reconciled, curriculum: reconciled.reconciledCurriculum };
      }));
      setUser(meUser);
      setCourses(reconciledCourses);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('morning');
    if (hour < 18) return t('afternoon');
    return t('evening');
  };

  const handleContinueLearning = async (course: any) => {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      setResolvingNext(true);
      const courseId = course.id ?? course.course_id ?? 0;
      const [curriculum, progress, localCompletedIds] = await Promise.all([
        apiGetCurriculumFresh(courseId, token, language),
        apiGetProgressFresh(courseId, token).catch(() => null),
        getLocalCompletedIds(courseId).catch(() => []),
      ]);
      const reconciled = getReconciledCourseProgress({ courseId, curriculum, progress, localCompletedIds, fallbackTotal: course.total_items });
      const next = findFirstUnfinishedItem(reconciled.reconciledCurriculum);
      const target = next ? getCurriculumNavigationTarget(next) : null;

      if (target) {
        router.push(target as any);
      } else {
        router.push({ pathname: '/course/[id]', params: { id: String(courseId) } });
      }
    } catch {
      router.push({ pathname: '/course/[id]', params: { id: String(course.id ?? course.course_id ?? 0) } });
    } finally {
      setResolvingNext(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { textAlign: isRTL ? 'right' : 'left' }]}>{getGreeting()}</Text>
            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{resolveDisplayName(user)}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={[styles.heroTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('continueLearning')}</Text>
              <Text style={[styles.heroText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('continueLearningDescription')}</Text>
              {courses[0] ? (
                <TouchableOpacity style={styles.primaryButton} onPress={() => void handleContinueLearning(courses[0])} disabled={resolvingNext}>
                  <Text style={styles.primaryButtonText}>{resolvingNext ? t('loading') : t('continueLearning')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('currentEnrolledCourses')}</Text>
            </View>

            {courses.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>{t('noCoursesFound')}</Text></View>
            ) : (
              courses.map((course: any) => {
                const completed = course.completed ?? 0;
                const total = course.total ?? course.total_items ?? 0;
                const percent = course.percentage ?? 0;

                return (
                  <View key={course.id ?? course.course_id ?? course.title} style={styles.courseCard}>
                    <View style={styles.courseHeader}>
                      <Text style={styles.courseTitle}>{decodeHtmlEntities(course.title || course.name || 'Course')}</Text>
                      <Text style={styles.progressText}>{Math.round(percent)}%</Text>
                    </View>
                    <Text style={[styles.metaText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('itemsCompleted', { completed, total })}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${percent}%` }]} />
                    </View>
                    <View style={styles.buttonRow}>
                      <Link href={{ pathname: '/course/[id]', params: { id: String(course.id ?? course.course_id ?? 0) } }} asChild>
                        <TouchableOpacity style={styles.secondaryButton}>
                          <Text style={styles.secondaryButtonText}>{t('openCourse')}</Text>
                        </TouchableOpacity>
                      </Link>
                      <TouchableOpacity style={styles.primaryButton} onPress={() => void handleContinueLearning(course)} disabled={resolvingNext}>
                        <Text style={styles.primaryButtonText}>{resolvingNext ? t('loading') : t('continue')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: theme.colors.gold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  courseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  courseTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  progressText: {
    color: theme.colors.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#1B2732',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: 999,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  error: {
    color: theme.colors.danger,
    backgroundColor: '#2A1418',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5A2A2A',
  },
});

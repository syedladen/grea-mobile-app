import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import { apiGetCourses, apiGetMe, decodeHtmlEntities, getErrorMessage, getStoredToken, resolveDisplayName } from '@/src/lib/api';

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadDashboard() {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const [me, courseList] = await Promise.all([apiGetMe(token), apiGetCourses(token)]);
      const meUser = (me.user ?? me.data ?? me) as any;
      setUser(meUser);
      setCourses(Array.isArray(courseList) ? courseList : []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
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
            <Text style={styles.eyebrow}>Good evening</Text>
            <Text style={styles.title}>{resolveDisplayName(user)}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Your learning path</Text>
              <Text style={styles.heroText}>Stay on track with your course progress and continue where you left off.</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Courses</Text>
            </View>

            {courses.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No courses found yet.</Text></View>
            ) : (
              courses.map((course: any) => {
                const completed = Number(course.completed_items ?? 0);
                const total = Number(course.total_items ?? 1);
                const percent = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;

                return (
                  <View key={course.id ?? course.course_id ?? course.title} style={styles.courseCard}>
                    <View style={styles.courseHeader}>
                      <Text style={styles.courseTitle}>{decodeHtmlEntities(course.title || course.name || 'Course')}</Text>
                      <Text style={styles.progressText}>{Math.round(percent)}%</Text>
                    </View>
                    <Text style={styles.metaText}>{completed} / {total} items completed</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${percent}%` }]} />
                    </View>
                    <Link href={{ pathname: '/course/[id]', params: { id: String(course.id ?? course.course_id ?? 0) } }} asChild>
                      <TouchableOpacity style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Continue Learning</Text>
                      </TouchableOpacity>
                    </Link>
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
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
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
    fontSize: 24,
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
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '700',
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

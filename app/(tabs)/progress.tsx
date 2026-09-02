import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { apiGetCoursesFresh, apiGetProgressFresh, decodeHtmlEntities, getErrorMessage, getStoredToken } from '@/src/lib/api';

export default function ProgressScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadProgress = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const courseList = await apiGetCoursesFresh(token);
      const withProgress = await Promise.all(
        courseList.map(async (course: any) => {
          const progressData = await apiGetProgressFresh(course.id, token).catch(() => null);
          const completed = Number(progressData?.completed_items ?? progressData?.completed_count ?? course.completed_items ?? 0);
          const total = Number(progressData?.total_items ?? progressData?.total_count ?? course.total_items ?? 1);
          const percentage = total > 0 ? Math.min(100, Math.max(0, Number(((completed / total) * 100).toFixed(0)))) : 0;
          return { ...course, progress: percentage, completed, total };
        }),
      );

      setCourses(withProgress);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgress();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        <Text style={styles.title}>Progress</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
        ) : courses.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No courses in progress yet.</Text></View>
        ) : (
          courses.map((course: any) => (
            <TouchableOpacity
              key={course.id ?? course.course_id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: String(course.id ?? course.course_id ?? 0) } })}
            >
              <Text style={styles.cardTitle}>{decodeHtmlEntities(course.title || course.name || 'Course')}</Text>
              <Text style={styles.percent}>{course.progress ?? 0}%</Text>
              <Text style={styles.meta}>{course.completed ?? 0} of {course.total ?? 0} items completed</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${course.progress ?? 0}%` }]} />
              </View>
            </TouchableOpacity>
          ))
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
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  loadingBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  percent: {
    color: theme.colors.gold,
    fontSize: 28,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  barTrack: {
    height: 10,
    backgroundColor: '#1B2732',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: 999,
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

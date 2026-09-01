import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { apiGetCourses, apiGetProgress, decodeHtmlEntities, getErrorMessage, getStoredToken } from '@/src/lib/api';

export default function ProgressScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProgress() {
      try {
        const token = await getStoredToken();
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const courseList = await apiGetCourses(token);
        const withProgress = await Promise.all(
          courseList.map(async (course: any) => {
            const progressData = await apiGetProgress(course.id, token).catch(() => null);
            const completed = Number(progressData?.completed_items ?? progressData?.completed_count ?? course.completed_items ?? 0);
            const total = Number(progressData?.total_items ?? progressData?.total_count ?? course.total_items ?? 1);
            const percentage = total > 0 ? Math.min(100, Math.max(0, Number(((completed / total) * 100).toFixed(0)))) : 0;
            return { ...course, progress: percentage, completed, total };
          }),
        );

        setCourses(withProgress);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Progress</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
        ) : (
          courses.map((course: any) => (
            <View key={course.id} style={styles.card}>
              <Text style={styles.cardTitle}>{decodeHtmlEntities(course.title || course.name || 'Course')}</Text>
              <Text style={styles.percent}>{course.progress ?? 0}%</Text>
              <Text style={styles.meta}>{course.completed ?? 0} of {course.total ?? 0} items completed</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${course.progress ?? 0}%` }]} />
              </View>
            </View>
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
  error: {
    color: theme.colors.danger,
    backgroundColor: '#2A1418',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5A2A2A',
  },
});

import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { apiGetCoursesFresh, decodeHtmlEntities, getErrorMessage, getStoredToken } from '@/src/lib/api';

export default function LearnScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const courseList = await apiGetCoursesFresh(token);
      setCourses(Array.isArray(courseList) ? courseList : []);
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
      void loadCourses();
    }, [loadCourses]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        <Text style={styles.title}>Learn</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator size="large" color={theme.colors.gold} /></View>
        ) : courses.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No courses available.</Text></View>
        ) : (
          courses.map((course: any) => {
            const completed = Number(course.completed_items ?? 0);
            const total = Number(course.total_items ?? 0);
            const percent = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;
            const hasProgress = total > 0 || completed > 0;

            return (
              <View key={course.id ?? course.course_id ?? course.title} style={styles.courseCard}>
                <Text style={styles.courseTitle}>{decodeHtmlEntities(course.title || course.name || 'Course')}</Text>
                <Text style={styles.metaText}>{completed} / {total || 0} items completed</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${percent}%` }]} />
                </View>
                <Link href={{ pathname: '/course/[id]', params: { id: String(course.id ?? course.course_id ?? 0) } }} asChild>
                  <TouchableOpacity style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{hasProgress ? 'Continue' : 'Open Course'}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            );
          })
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
    paddingBottom: 40,
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
  courseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 12,
  },
  courseTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  metaText: {
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
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 14,
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

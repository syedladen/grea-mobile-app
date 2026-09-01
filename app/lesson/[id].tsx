import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHTML from 'react-native-render-html';

import { theme } from '@/constants/theme';
import {
    apiCompleteLesson,
    apiGetCurriculum,
    apiGetLesson,
    apiGetProgress,
    decodeHtmlEntities,
    extractMasteriyoError,
    getErrorMessage,
    getStoredToken,
    isMasteriyoSyncFailure,
} from '@/src/lib/api';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLesson() {
      const token = await getStoredToken();
      if (!token || !id) {
        router.replace('/login');
        return;
      }

      try {
        const data = await apiGetLesson(id, token);
        setLesson(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [id]);

  async function handleComplete() {
    const token = await getStoredToken();
    if (!token || !id) return;

    try {
      setMarking(true);
      setError('');

      const result = await apiCompleteLesson(id, token);
      const syncFailed = isMasteriyoSyncFailure(result);

      if (syncFailed) {
        const backendError = extractMasteriyoError(result);
        setError(`Masteriyo sync failed: ${backendError}`);
        return;
      }

      const courseId = result.course_id ?? result.courseId ?? lesson?.course_id ?? lesson?.courseId;

      if (courseId) {
        await Promise.all([
          apiGetProgress(courseId, token),
          apiGetCurriculum(courseId, token),
        ]);
      }

      const refreshed = await apiGetLesson(id, token);
      setLesson(refreshed);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMarking(false);
    }
  }

  const articleContent = lesson?.content || lesson?.html || lesson?.body || '';

  const goToNode = (nextType: string | null | undefined, nextId?: number | string | null) => {
    if (!nextId) return;
    const path = nextType === 'quiz' ? '/quiz/[id]' : nextType === 'assignment' || nextType === 'project' ? '/assignment/[id]' : '/lesson/[id]';
    router.push({ pathname: path, params: { id: String(nextId) } });
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>Back</Text></TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{decodeHtmlEntities(lesson?.title || 'Lesson')}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {lesson ? (
            <>
              <RenderHTML
                contentWidth={width - 32}
                source={{ html: articleContent || '<p>No content available.</p>' }}
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
                  <View style={styles.completedPill}><Text style={styles.completedText}>Completed</Text></View>
                ) : (
                  <TouchableOpacity style={styles.primaryButton} onPress={handleComplete} disabled={marking}>
                    <Text style={styles.primaryButtonText}>{marking ? 'Saving...' : 'Mark Complete'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : null}

          <View style={styles.navRow}>
            {lesson?.previous_id ? (
              <TouchableOpacity style={styles.navButton} onPress={() => goToNode(lesson.previous_type, lesson.previous_id)}>
                <Text style={styles.navText}>Previous</Text>
              </TouchableOpacity>
            ) : <View style={styles.navPlaceholder} />}

            {lesson?.next_id ? (
              <TouchableOpacity style={styles.navButtonPrimary} onPress={() => goToNode(lesson.next_type, lesson.next_id)}>
                <Text style={styles.navTextPrimary}>Next</Text>
              </TouchableOpacity>
            ) : <View style={styles.navPlaceholder} />}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    padding: 20,
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navButtonPrimary: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  navTextPrimary: {
    color: theme.colors.background,
    fontWeight: '700',
  },
  navPlaceholder: {
    flex: 1,
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

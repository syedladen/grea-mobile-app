import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import { apiGetCourse, apiGetCurriculum, apiGetProgress, cleanDisplayText, deduplicateSectionItems, getErrorMessage, getStoredToken } from '@/src/lib/api';

export default function CourseDetailScreen() {
  const { t, isRTL } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const loadCourse = useCallback(async () => {
    const token = await getStoredToken();
    if (!token || !id) {
      router.replace('/login');
      return;
    }

    try {
      const [courseData, curriculumData, progressData] = await Promise.all([
        apiGetCourse(id, token),
        apiGetCurriculum(id, token),
        apiGetProgress(id, token).catch(() => null),
      ]);

      setCourse(courseData);
      setCurriculum(Array.isArray(curriculumData) ? curriculumData : []);
      setProgress(progressData);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadCourse();
      return undefined;
    }, [loadCourse]),
  );

  const sectionItems = useMemo(() => {
    return curriculum.map((section: any, sectionIndex: number) => {
      const title = cleanDisplayText(section.title || section.name || t('module'));
      const items = deduplicateSectionItems(Array.isArray(section.items) ? section.items : []);
      const completeCount = items.filter((item: any) => item.completed).length;
      const key = `${title}-${sectionIndex}`;
      const expanded = expandedSections[key] ?? false;
      return { key, title, items, completeCount, expanded };
    });
  }, [curriculum, expandedSections, t]);

  const handleItemPress = (item: any) => {
    const itemId = item.id ?? item.lesson_id ?? item.quiz_id ?? item.assignment_id ?? item.project_id;
    const type = String(item.type || '').toLowerCase();

    if (type === 'quiz') {
      router.push({ pathname: '/quiz/[id]', params: { id: String(item.id ?? item.quiz_id ?? itemId) } });
      return;
    }

    if (type === 'assignment' || type === 'project') {
      router.push({ pathname: '/assignment/[id]', params: { id: String(item.id ?? item.assignment_id ?? item.project_id ?? itemId) } });
      return;
    }

    router.push({ pathname: '/lesson/[id]', params: { id: String(item.id ?? item.lesson_id ?? itemId) } });
  };

  const getItemIcon = (type: string) => {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'quiz') return 'help-circle';
    if (normalized === 'assignment' || normalized === 'project') return 'document-text';
    return 'book';
  };

  const renderItem = (item: any) => {
    const type = String(item.type || '').toUpperCase();
    const title = cleanDisplayText(item.title || item.name || t('lesson'));
    return (
      <TouchableOpacity key={String(item.id ?? item.lesson_id ?? item.quiz_id ?? item.assignment_id ?? item.project_id ?? title)} style={[styles.item, item.completed && styles.itemCompleted]} onPress={() => handleItemPress(item)}>
        <View style={styles.itemHeader}>
          <View style={[styles.dot, item.completed && styles.dotDone]} />
          <Ionicons name={getItemIcon(item.type) as any} size={18} color={item.completed ? theme.colors.success : theme.colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{title}</Text>
            <Text style={styles.itemMeta}>{type || 'LESSON'}</Text>
          </View>
          {item.completed ? <Text style={styles.done}>Done</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourse();
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <FlatList
          contentContainerStyle={styles.content}
          data={sectionItems}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
          ListHeaderComponent={
            <>
              <Text style={[styles.eyebrow, { textAlign: isRTL ? 'right' : 'left' }]}>{t('course')}</Text>
              <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{cleanDisplayText(course?.title || course?.name || t('course'))}</Text>
              <Text style={[styles.progressLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{progress ? `${progress.progress ?? progress.percentage ?? 0}% ${t('complete')}` : t('progressUnavailable')}</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          }
          renderItem={({ item }) => {
            const open = item.expanded;
            return (
              <View style={styles.sectionBlock}>
                <TouchableOpacity style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => toggleSection(item.key)}>
                  <View style={styles.sectionHeaderMeta}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    <Text style={[styles.sectionComplete, { textAlign: isRTL ? 'right' : 'left' }]}>{item.completeCount}/{item.items.length} {t('complete')}</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.gold} />
                </TouchableOpacity>
                {open && (
                  <View style={styles.sectionList}>
                    {item.items.length === 0 ? <Text style={styles.emptySmall}>{t('noItemsInSection')}</Text> : item.items.map((entry: any) => renderItem(entry))}
                  </View>
                )}
              </View>
            );
          }}
          keyExtractor={(item) => item.key}
          ListEmptyComponent={<Text style={styles.empty}>{t('noCurriculumItems')}</Text>}
        />
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
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  eyebrow: {
    color: theme.colors.gold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontWeight: '700',
  },
  title: {
    marginTop: 8,
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  progressLabel: {
    color: theme.colors.muted,
    marginTop: 8,
    fontSize: 15,
  },
  sectionBlock: {
    backgroundColor: '#0F171E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderMeta: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionComplete: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  sectionList: {
    gap: 10,
  },
  item: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  itemCompleted: {
    borderColor: '#2F5D47',
    backgroundColor: '#122318',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.gold,
  },
  dotDone: {
    backgroundColor: theme.colors.success,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  itemMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 5,
    letterSpacing: 0.8,
  },
  done: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    color: theme.colors.muted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 30,
  },
  emptySmall: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  error: {
    marginTop: 12,
    color: theme.colors.danger,
    backgroundColor: '#2A1418',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5A2A2A',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import {
    apiGetCurriculum,
    apiGetProgress,
    apiGetQuiz,
    apiSubmitQuiz,
    cleanDisplayText,
    extractMasteriyoError,
    getErrorMessage,
    getStoredToken,
    isMasteriyoSyncFailure,
} from '@/src/lib/api';
import { flattenCurriculumItems, getCurriculumNavigationTarget } from '@/src/lib/curriculum-navigation';

export default function QuizScreen() {
  const { t, language, isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<any>(null);
  const [syncWarning, setSyncWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadQuiz = useCallback(async () => {
    const token = await getStoredToken();
    if (!token || !id) {
      router.replace('/login');
      return;
    }

    try {
      const data = await apiGetQuiz(id, token, language);
      setQuiz(data);
      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, language]);

  useFocusEffect(
    useCallback(() => {
      void loadQuiz();
      return undefined;
    }, [loadQuiz]),
  );

  const currentQuestion = questions[currentIndex];
  const questionId = currentQuestion?.id ?? currentQuestion?.questionId ?? String(currentIndex);
  const contentWidth = width - 40;

  function toggleChoice(choice: any) {
    const value = String(choice?.id ?? choice?.value ?? choice?.label ?? '');
    const current = answers[questionId] ?? [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [value];
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
  }

  function hasSuccessfulQuizResult(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const record = payload as Record<string, unknown>;
    const result = record.result as Record<string, unknown> | undefined;

    return (
      typeof record.score === 'number' ||
      typeof record.pass === 'boolean' ||
      typeof record.passed === 'boolean' ||
      typeof result?.score === 'number' ||
      typeof result?.pass === 'boolean' ||
      typeof result?.passed === 'boolean' ||
      !!record.result
    );
  }

  async function handleRetrySync() {
    const token = await getStoredToken();
    const courseId = quiz?.course_id ?? quiz?.courseId;
    if (!token || !courseId) {
      setSyncWarning(t('retryLater'));
      return;
    }

    try {
      await Promise.all([
        apiGetProgress(courseId, token),
        apiGetCurriculum(courseId, token, undefined, language),
      ]);
      setSyncWarning('');
      setError('');
    } catch (err) {
      setSyncWarning(t('retryFailed', { message: getErrorMessage(err) }));
    }
  }

  async function handleSubmit() {
    if (!id || submitting) return;
    const token = await getStoredToken();
    if (!token) {
      setError(t('authenticationRequired'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSyncWarning('');
      const payload = await apiSubmitQuiz(id, answers, token);

      if (__DEV__) {
        console.log('[Quiz submit payload]', payload);
      }

      const syncFailed = isMasteriyoSyncFailure(payload);
      const hasResult = hasSuccessfulQuizResult(payload);

      if (syncFailed && !hasResult) {
        const backendError = extractMasteriyoError(payload);
        setError(backendError || t('somethingWentWrong'));
        setResult(null);
        return;
      }

      const courseId = payload.course_id ?? payload.courseId ?? quiz?.course_id ?? quiz?.courseId;
      if (courseId) {
        await Promise.all([
          apiGetProgress(courseId, token),
          apiGetCurriculum(courseId, token, undefined, language),
        ]);
      }

      setResult(payload);

      if (syncFailed) {
        setSyncWarning(t('retryLater'));
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setSyncWarning('');
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  }

  const goToNextItem = async () => {
    const token = await getStoredToken();
    const courseId = quiz?.course_id ?? quiz?.courseId;
    if (!courseId || !token) {
      router.push('/(tabs)');
      return;
    }

    try {
      const curriculum = await apiGetCurriculum(courseId, token, undefined, language);
      const items = flattenCurriculumItems(curriculum);
      const currentIndexInList = items.findIndex((item) => {
        const itemId = item.id ?? item.lesson_id ?? item.quiz_id ?? item.assignment_id ?? item.project_id;
        return itemId !== undefined && String(itemId) === String(id);
      });
      const next = currentIndexInList >= 0 ? items[currentIndexInList + 1] : null;
      const target = next ? getCurriculumNavigationTarget(next) : null;
      if (target) {
        router.push(target as any);
        return;
      }
    } catch {
      // ignore and fall back
    }

    router.push({ pathname: '/course/[id]', params: { id: String(courseId) } });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (result) {
    const pass = Boolean(result.pass ?? result.passed ?? result.result?.pass);
    const scoreValue = Number(result.score ?? result.result?.score ?? 0);
    const passMarkValue = Number(quiz?.pass_mark ?? quiz?.pass_mark_percent ?? quiz?.pass_mark_percentage ?? 0);
    const totalQuestions = Number(quiz?.total_questions ?? questions.length ?? 0);
    const normalizedScore = totalQuestions > 0 && scoreValue <= totalQuestions ? (scoreValue / totalQuestions) * 100 : scoreValue;
    const normalizedPassMark = totalQuestions > 0 && passMarkValue <= totalQuestions ? (passMarkValue / totalQuestions) * 100 : passMarkValue;
    const correctCount = Number(result.correct_answers ?? result.correct ?? result.correctCount ?? result.result?.correct_answers ?? result.result?.correct ?? 0);

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.resultScrollContent}>
          <View style={styles.resultBox}>
            <Text style={styles.eyebrow}>{t('quizResult')}</Text>
            <Text style={styles.resultTitle}>{pass ? t('passed') : t('notPassed')}</Text>
            <Text style={styles.resultScore}>{Number.isFinite(normalizedScore) ? `${Math.round(normalizedScore)}%` : '0%'}</Text>
            <Text style={styles.resultMeta}>{t('passMark')}: {Number.isFinite(normalizedPassMark) ? `${Math.round(normalizedPassMark)}%` : '0%'}</Text>
            <Text style={styles.resultMeta}>{t('correctAnswers')}: {correctCount}</Text>
            <Text style={styles.resultMeta}>{pass ? t('passed') : t('retakeQuiz')}</Text>

            {syncWarning ? (
              <View style={styles.syncWarningBox}>
                <Text style={styles.syncWarningText}>{syncWarning}</Text>
                <TouchableOpacity style={styles.syncButton} onPress={() => void handleRetrySync()}>
                  <Text style={styles.syncButtonText}>{t('retrySync')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.resultActions}>
              {pass ? (
                <TouchableOpacity style={styles.primaryButton} onPress={() => void goToNextItem()}>
                  <Text style={styles.primaryButtonText}>{t('continueNextItem')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryButton} onPress={() => { setResult(null); setSyncWarning(''); setAnswers({}); setCurrentIndex(0); setError(''); }}>
                  <Text style={styles.primaryButtonText}>{t('retakeQuiz')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push({ pathname: '/course/[id]', params: { id: String(quiz?.course_id ?? quiz?.courseId ?? 0) } })}>
                <Text style={styles.secondaryButtonText}>{t('backToCourse')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tertiaryButton} onPress={() => router.push('/(tabs)')}>
                <Ionicons name="home" size={16} color={theme.colors.text} />
                <Text style={styles.tertiaryButtonText}>{t('home')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyBox}><Text style={styles.emptyText}>{t('noQuizQuestions')}</Text></View>
      </SafeAreaView>
    );
  }

  const currentChoices = currentQuestion.choices ?? currentQuestion.answers ?? [];
  const progress = ((currentIndex + 1) / Math.max(questions.length, 1)) * 100;
  const promptText = cleanDisplayText(currentQuestion.question || currentQuestion.title || currentQuestion.prompt || `Question ${currentIndex + 1}`);
  const rawPrompt = String(currentQuestion.question || currentQuestion.title || currentQuestion.prompt || '');
  const usesHtmlPrompt = rawPrompt.includes('<');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.progressText}>{currentIndex + 1}/{questions.length}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.homeButton}>
            <Ionicons name="home" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>

        {usesHtmlPrompt ? (
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html: rawPrompt }}
            baseStyle={{ color: theme.colors.text, fontSize: 28, lineHeight: 36, direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
            tagsStyles={{
              p: { color: theme.colors.text, marginBottom: 12 },
              strong: { color: theme.colors.text },
              em: { color: theme.colors.text },
              ul: { marginLeft: 18 },
              li: { color: theme.colors.text, marginBottom: 6 },
              h1: { color: theme.colors.text, marginBottom: 12 },
              h2: { color: theme.colors.text, marginBottom: 10 },
              h3: { color: theme.colors.text, marginBottom: 10 },
              a: { color: theme.colors.gold },
            }}
          />
        ) : (
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{promptText}</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.optionList}>
          {currentChoices.map((choice: any, index: number) => {
            const value = String(choice.id ?? choice.value ?? choice.label ?? index);
            const selected = (answers[questionId] ?? []).includes(value);
            return (
              <TouchableOpacity key={`${questionId}-${index}`} style={[styles.option, selected && styles.optionSelected]} onPress={() => toggleChoice(choice)}>
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <Text style={[styles.optionText, { textAlign: isRTL ? 'right' : 'left' }]}>{cleanDisplayText(choice.label ?? choice.text ?? choice.value ?? t('choice', { number: index + 1 }))}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footerRow}>
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentIndex((prev) => prev - 1)}>
              <Text style={styles.secondaryButtonText}>{t('previous')}</Text>
            </TouchableOpacity>
          ) : <View style={styles.secondaryPlaceholder} />}

          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentIndex((prev) => prev + 1)}>
              <Text style={styles.primaryButtonText}>{t('next')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? t('loading') : t('submitQuiz')}</Text>
            </TouchableOpacity>
          )}
        </View>
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
    gap: 18,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  backText: {
    color: theme.colors.text,
    fontWeight: '600',
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
  progressText: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.gold,
    fontWeight: '700',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#1B2732',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: 999,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  optionList: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
    minHeight: 52,
  },
  optionSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: '#1A1A15',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.muted,
  },
  radioSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.gold,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '700',
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
    minHeight: 48,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  tertiaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  secondaryPlaceholder: {
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
  resultScrollContent: {
    padding: 20,
    paddingBottom: 28,
  },
  resultBox: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    gap: 12,
    minHeight: 0,
  },
  eyebrow: {
    color: theme.colors.gold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  resultTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  resultScore: {
    color: theme.colors.gold,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  resultMeta: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  syncWarningBox: {
    backgroundColor: '#201813',
    borderWidth: 1,
    borderColor: '#5F4733',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  syncWarningText: {
    color: '#F9D8A7',
    fontSize: 14,
    lineHeight: 20,
  },
  syncButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A211B',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  syncButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  resultActions: {
    gap: 12,
    marginTop: 8,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.text,
    fontSize: 16,
  },
});

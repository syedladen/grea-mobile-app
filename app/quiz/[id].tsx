import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
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

export default function QuizScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadQuiz() {
      const token = await getStoredToken();
      if (!token || !id) {
        router.replace('/login');
        return;
      }

      try {
        const data = await apiGetQuiz(id, token);
        setQuiz(data);
        setQuestions(Array.isArray(data?.questions) ? data.questions : []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [id]);

  const currentQuestion = questions[currentIndex];
  const questionId = currentQuestion?.id ?? currentQuestion?.questionId ?? String(currentIndex);
  const contentWidth = width - 40;

  function toggleChoice(choice: any) {
    const value = String(choice?.id ?? choice?.value ?? choice?.label ?? '');
    const current = answers[questionId] ?? [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [value];
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
  }

  async function handleSubmit() {
    if (!id || submitting) return;
    const token = await getStoredToken();
    if (!token) {
      setError('Authentication required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = await apiSubmitQuiz(id, answers, token);
      const syncFailed = isMasteriyoSyncFailure(payload);

      if (syncFailed) {
        const backendError = extractMasteriyoError(payload);
        setError(`Masteriyo sync failed: ${backendError}`);
        setResult(null);
        return;
      }

      const courseId = payload.course_id ?? payload.courseId ?? quiz?.course_id ?? quiz?.courseId;
      if (courseId) {
        await Promise.all([
          apiGetProgress(courseId, token),
          apiGetCurriculum(courseId, token),
        ]);
      }

      setResult(payload);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

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
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{pass ? 'Passed' : 'Not Passed'}</Text>
          <Text style={styles.resultScore}>Score: {Number.isFinite(normalizedScore) ? `${Math.round(normalizedScore)}%` : '0%'}</Text>
          <Text style={styles.resultMeta}>Pass mark: {Number.isFinite(normalizedPassMark) ? `${Math.round(normalizedPassMark)}%` : '0%'}</Text>
          <Text style={styles.resultMeta}>{correctCount > 0 ? `Correct answers: ${correctCount}` : 'Correct answers: 0'}</Text>
          <Text style={styles.resultMeta}>{pass ? 'You passed this quiz.' : 'You can retake the quiz and try again.'}</Text>
          {pass ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={() => { setResult(null); setAnswers({}); setCurrentIndex(0); setError(''); }}>
              <Text style={styles.primaryButtonText}>Retake</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyBox}><Text style={styles.emptyText}>No quiz questions found.</Text></View>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>Back</Text></TouchableOpacity>
          <Text style={styles.progressText}>{currentIndex + 1}/{questions.length}</Text>
        </View>

        <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>

        {usesHtmlPrompt ? (
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html: rawPrompt }}
            baseStyle={{ color: theme.colors.text, fontSize: 28, lineHeight: 36 }}
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
          <Text style={styles.title}>{promptText}</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.optionList}>
          {currentChoices.map((choice: any, index: number) => {
            const value = String(choice.id ?? choice.value ?? choice.label ?? index);
            const selected = (answers[questionId] ?? []).includes(value);
            return (
              <TouchableOpacity key={`${questionId}-${index}`} style={[styles.option, selected && styles.optionSelected]} onPress={() => toggleChoice(choice)}>
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <Text style={styles.optionText}>{cleanDisplayText(choice.label ?? choice.text ?? choice.value ?? `Choice ${index + 1}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footerRow}>
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentIndex((prev) => prev - 1)}>
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : <View style={styles.secondaryPlaceholder} />}

          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentIndex((prev) => prev + 1)}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
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
  },
  backButton: {
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
  progressText: {
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
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  optionList: {
    gap: 12,
  },
  option: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: '#1B1A11',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.muted,
  },
  radioSelected: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
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
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  secondaryPlaceholder: {
    flex: 1,
  },
  resultBox: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  resultTitle: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  resultScore: {
    color: theme.colors.gold,
    fontSize: 22,
    fontWeight: '700',
  },
  resultMeta: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  error: {
    color: theme.colors.danger,
    backgroundColor: '#2A1418',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5A2A2A',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 16,
  },
});

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import {
    apiGetAssignmentSubmission,
    apiGetCourses,
    apiGetCurriculum,
    apiGetLesson,
    apiGetProgress,
    apiSubmitAssignment,
    AssignmentSubmission,
    cleanDisplayText,
    getErrorMessage,
    getStoredToken,
    normalizeAssignmentSubmission,
    sanitizeContentForNative,
} from '@/src/lib/api';
import { flattenCurriculumItems, getCurriculumNavigationTarget } from '@/src/lib/curriculum-navigation';

const defaultLimits = {
  max_files: 5,
  max_mb: 20,
  allowed_exts: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
};

function formatDate(value?: string | null): string {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(size?: number | string | null): string {
  const bytes = Number(size ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssignmentScreen() {
  const { t, isRTL } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [lesson, setLesson] = useState<any>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{ uri: string; name: string; type?: string; size?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const assignmentStatus = String(submission?.status ?? 'not_submitted').toLowerCase();
  const canSubmit = Boolean(submission?.can_submit ?? false);
  const limits = submission?.limits ?? defaultLimits;
  const maxFiles = Number(limits?.max_files ?? defaultLimits.max_files);
  const maxMb = Number(limits?.max_mb ?? defaultLimits.max_mb);
  const allowedExts = Array.isArray(limits?.allowed_exts) && limits.allowed_exts.length > 0 ? limits.allowed_exts.map((ext: string) => String(ext).trim().toLowerCase()) : defaultLimits.allowed_exts;
  const existingFiles = Array.isArray(submission?.files) ? submission.files : [];
  const hasResponseText = Boolean(String(submission?.text ?? submission?.content ?? '').trim());
  const scoreValue = submission && (submission.score !== undefined || submission.max_score !== undefined)
    ? `${submission.score ?? 0} / ${submission.max_score ?? submission.score ?? 0}`
    : null;

  const applyFreshSubmission = useCallback((fresh: AssignmentSubmission | null) => {
    setSubmission(fresh);
    setText(fresh?.text ?? '');
  }, []);

  const loadAssignment = useCallback(async (withLoading = true) => {
    const token = await getStoredToken();
    if (!token || !id) {
      router.replace('/login');
      return;
    }

    const version = ++requestVersion.current;
    if (withLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [lessonData, submissionResponse] = await Promise.all([
        apiGetLesson(id, token),
        apiGetAssignmentSubmission(id, token, Date.now()),
      ]);

      if (version !== requestVersion.current) {
        return;
      }

      setLesson(lessonData);
      const fresh = normalizeAssignmentSubmission(submissionResponse);
      if (fresh) {
        applyFreshSubmission(fresh);
      } else {
        setSubmission(null);
        setText('');
      }
      setError('');
    } catch (err) {
      if (version !== requestVersion.current) {
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyFreshSubmission, id]);

  useFocusEffect(
    useCallback(() => {
      void loadAssignment(true);
      return undefined;
    }, [loadAssignment]),
  );

  const statusLabel = useMemo(() => {
    switch (assignmentStatus) {
      case 'submitted':
        return t('submitted');
      case 'graded':
        return t('graded');
      case 'resubmit':
        return t('resubmissionRequired');
      default:
        return t('notSubmitted');
    }
  }, [assignmentStatus, t]);

  const assignmentHtml = sanitizeContentForNative(lesson?.content || lesson?.body || '');
  const assignmentText = cleanDisplayText(lesson?.content || lesson?.body || '');

  const goToNextItem = useCallback(async () => {
    const token = await getStoredToken();
    const courseId = lesson?.course_id ?? lesson?.courseId;
    if (!courseId || !token) {
      router.push('/(tabs)');
      return;
    }

    try {
      const curriculum = await apiGetCurriculum(courseId, token);
      const items = flattenCurriculumItems(curriculum);
      const currentIndex = items.findIndex((item) => {
        const itemId = item.id ?? item.lesson_id ?? item.quiz_id ?? item.assignment_id ?? item.project_id;
        return itemId !== undefined && String(itemId) === String(id);
      });
      const next = currentIndex >= 0 ? items[currentIndex + 1] : null;
      const target = next ? getCurriculumNavigationTarget(next) : null;
      if (target) {
        router.push(target);
        return;
      }
    } catch {
      // ignore
    }

    router.push({ pathname: '/course/[id]', params: { id: String(courseId) } });
  }, [id, lesson?.course_id, lesson?.courseId]);

  async function handleSelectFiles() {
    if (!canSubmit) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const assets = Array.isArray(result.assets) ? result.assets : [];
      if (assets.length === 0) return;

      const selected = assets.map((asset) => {
        const name = String(asset.name || 'document');
        const ext = (name.split('.').pop() || '').toLowerCase();
        const normalizedSize = Number(asset.size ?? 0) || 0;
        return { uri: asset.uri, name, type: asset.mimeType || 'application/octet-stream', size: normalizedSize, ext };
      });

      const allowed = selected.filter((file) => {
        if (!allowedExts.includes(file.ext)) {
          setError(`Unsupported file type: ${file.name}. Allowed: ${allowedExts.join(', ').toUpperCase()}`);
          return false;
        }

        if (file.size > maxMb * 1024 * 1024) {
          setError(`File exceeds ${maxMb} MB limit: ${file.name}`);
          return false;
        }

        return true;
      });

      if (allowed.length === 0) return;

      const nextFiles = [...selectedFiles, ...allowed];
      if (nextFiles.length > maxFiles) {
        setError(`You can upload up to ${maxFiles} files.`);
        return;
      }

      setSelectedFiles(nextFiles);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSubmit() {
    const token = await getStoredToken();
    if (!token || !id) return;

    if (!canSubmit) {
      setError('This assignment is closed for new submissions.');
      return;
    }

    const hasText = !!text.trim();
    const hasFiles = selectedFiles.length > 0;
    if (!hasText && !hasFiles) {
      setError('Add a written response or upload at least one file before submitting.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const result = await apiSubmitAssignment(id, text, selectedFiles, token);
      const saved = normalizeAssignmentSubmission(result.submission ?? result);

      requestVersion.current += 1;
      if (saved) {
        setSubmission(saved);
        setText(saved.text ?? '');
        setSelectedFiles([]);
      }
      setShowSuccessActions(true);

      const followVersion = ++requestVersion.current;
      const refreshed = await apiGetAssignmentSubmission(id, token, Date.now());
      const fresh = normalizeAssignmentSubmission(refreshed);
      if (followVersion !== requestVersion.current) {
        return;
      }
      if (fresh) {
        applyFreshSubmission(fresh);
      } else if (saved) {
        applyFreshSubmission(saved);
      }

      const courseId = lesson?.course_id ?? lesson?.courseId;
      if (courseId) {
        await Promise.all([
          apiGetProgress(courseId, token),
          apiGetCurriculum(courseId, token),
          apiGetCourses(token),
        ]);
      }

      setError(result?.message ? String(result.message) : (saved ? 'Assignment submitted' : 'Submission updated'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenFile(file: { download_url?: string; url?: string; name?: string }) {
    const url = file.download_url || file.url;
    if (!url) return;

    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
            <Text style={styles.backText}>{t('back')}</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.homeButton}>
              <Ionicons name="home" size={18} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void loadAssignment(false)} style={styles.refreshButton} disabled={refreshing || saving}>
              <Ionicons name="refresh" size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.statusRow}><Text style={[styles.statusPill, assignmentStatus === 'graded' && styles.statusGraded, assignmentStatus === 'resubmit' && styles.statusResubmit]}>{statusLabel}</Text></View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
        ) : (
          <>
            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{cleanDisplayText(lesson?.title || t('assignment'))}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {assignmentHtml ? (
              <View style={styles.briefBox}>
                <Text style={styles.sectionLabel}>{t('brief')}</Text>
                <RenderHTML
                  contentWidth={width - 40}
                  source={{ html: assignmentHtml || `<p>${t('brief')}</p>` }}
                  baseStyle={{ color: theme.colors.text, fontSize: 16, lineHeight: 26 }}
                  tagsStyles={{
                    p: { color: theme.colors.text, marginBottom: 12 },
                    h1: { color: theme.colors.text, fontSize: 28, marginBottom: 12 },
                    h2: { color: theme.colors.text, fontSize: 24, marginBottom: 10 },
                    h3: { color: theme.colors.text, fontSize: 20, marginBottom: 10 },
                    strong: { color: theme.colors.text },
                    em: { color: theme.colors.text },
                    li: { color: theme.colors.text, marginBottom: 6 },
                    ul: { marginLeft: 18 },
                    ol: { marginLeft: 18 },
                    a: { color: theme.colors.gold },
                  }}
                />
              </View>
            ) : null}

            {!assignmentHtml && assignmentText ? (
              <View style={styles.briefBox}>
                <Text style={styles.sectionLabel}>{t('brief')}</Text>
                <Text style={styles.briefText}>{assignmentText}</Text>
              </View>
            ) : null}

            {(assignmentStatus === 'graded' || assignmentStatus === 'submitted' || assignmentStatus === 'resubmit' || hasResponseText || existingFiles.length > 0) && (
              <View style={styles.submissionCard}>
                <Text style={styles.sectionLabel}>{t('submission')}</Text>

                {assignmentStatus === 'graded' && scoreValue ? (
                  <Text style={styles.scoreText}>{t('score')}: {scoreValue}</Text>
                ) : null}

                {submission?.feedback ? (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackTitle}>{t('instructorFeedback')}</Text>
                    <Text style={styles.feedbackText}>{cleanDisplayText(submission.feedback)}</Text>
                  </View>
                ) : null}

                {hasResponseText ? (
                  <View style={styles.responseBox}>
                    <Text style={styles.boxTitle}>{t('yourWrittenResponse')}</Text>
                    <Text style={styles.responseText}>{cleanDisplayText(submission?.text ?? submission?.content ?? '')}</Text>
                  </View>
                ) : null}

                {existingFiles.length > 0 ? (
                  <View style={styles.responseBox}>
                    <Text style={styles.boxTitle}>{t('uploadedFiles')}</Text>
                    {existingFiles.map((file: any, index: number) => {
                      const ext = String(file.ext || file.name?.split('.').pop() || 'file').toUpperCase();
                      const fileName = String(file.name || `File ${index + 1}`);

                      return (
                        <TouchableOpacity key={`${file.id ?? file.name ?? index}`} style={styles.fileRow} onPress={() => handleOpenFile(file)}>
                          <View style={styles.fileBadge}><Text style={styles.fileBadgeText}>{ext}</Text></View>
                          <View style={styles.fileMetaWrap}>
                            <Text style={styles.fileName}>{fileName}</Text>
                            <Text style={styles.fileMeta}>{formatFileSize(file.size)} • {file.ext || 'file'}</Text>
                          </View>
                          <Text style={styles.openText}>{t('open')}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {(submission?.submitted_at || submission?.updated_at || submission?.graded_at) ? (
                  <Text style={styles.metaText}>
                    {submission?.graded_at ? `Graded: ${formatDate(submission.graded_at)}` : submission?.submitted_at ? `Submitted: ${formatDate(submission.submitted_at)}` : `Updated: ${formatDate(submission.updated_at)}`}
                  </Text>
                ) : null}
              </View>
            )}

            {canSubmit ? (
              <View style={styles.formBox}>
                  <Text style={styles.sectionLabel}>{t('updateResubmit')}</Text>
                <TextInput
                  style={styles.editor}
                  value={text}
                  onChangeText={setText}
                  multiline
                  placeholder={t('writeResponse')}
                  placeholderTextColor={theme.colors.muted}
                  textAlignVertical="top"
                />

                <View style={styles.uploadBox}>
                  <Text style={styles.uploadHeading}>{t('uploadFiles')}</Text>
                  <Text style={styles.uploadMeta}>{`Up to ${maxFiles} files • ${maxMb} MB each • ${allowedExts.join(', ').toUpperCase()}`}</Text>

                  {selectedFiles.length > 0 ? (
                    <View style={styles.fileList}>
                      {selectedFiles.map((file, index) => (
                        <View key={`${file.name}-${index}`} style={styles.selectedFileRow}>
                          <Text style={styles.selectedFileName} numberOfLines={1}>{file.name}</Text>
                          <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>
                            <Text style={styles.removeButtonText}>{t('remove')}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.secondaryButton} onPress={handleSelectFiles}>
                    <Text style={styles.secondaryButtonText}>{t('addFiles')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.submitStack}>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}>
                    <Text style={styles.primaryButtonText}>{saving ? t('loading') : assignmentStatus === 'resubmit' ? t('submitAssignment') : assignmentStatus === 'submitted' ? t('updateResubmit') : t('submitAssignment')}</Text>
                  </TouchableOpacity>
                  {showSuccessActions ? (
                    <>
                      <TouchableOpacity style={styles.primaryButton} onPress={() => void goToNextItem()}>
                        <Text style={styles.primaryButtonText}>{t('continueNextItem')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push({ pathname: '/course/[id]', params: { id: String(lesson?.course_id ?? lesson?.courseId ?? 0) } })}>
                        <Text style={styles.secondaryButtonText}>{t('backToCourse')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.tertiaryButton} onPress={() => router.push('/(tabs)')}>
                        <Ionicons name="home" size={16} color={theme.colors.text} />
                        <Text style={styles.tertiaryButtonText}>{t('home')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.closedBox}>
                <Text style={styles.closedTitle}>{t('submissionClosed')}</Text>
                <Text style={styles.closedText}>{t('assignmentClosed')}</Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push({ pathname: '/course/[id]', params: { id: String(lesson?.course_id ?? lesson?.courseId ?? 0) } })}>
                  <Text style={styles.secondaryButtonText}>{t('backToCourse')}</Text>
                </TouchableOpacity>
              </View>
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
  content: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  homeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  refreshText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  statusRow: {
    alignItems: 'flex-start',
  },
  statusPill: {
    backgroundColor: '#163726',
    borderWidth: 1,
    borderColor: '#2F5D47',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.success,
    fontWeight: '700',
  },
  statusGraded: {
    backgroundColor: '#1C1A17',
    borderColor: '#C5A15B',
    color: theme.colors.gold,
  },
  statusResubmit: {
    backgroundColor: '#2A1418',
    borderColor: '#7E3A3D',
    color: '#F7B2B4',
  },
  loadingBox: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  sectionLabel: {
    color: theme.colors.gold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  briefBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 16,
  },
  briefText: {
    color: theme.colors.text,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
  },
  submissionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  scoreText: {
    color: theme.colors.gold,
    fontWeight: '700',
    fontSize: 18,
  },
  feedbackBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  feedbackTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 6,
  },
  feedbackText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  responseBox: {
    backgroundColor: '#101A20',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  boxTitle: {
    color: theme.colors.gold,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  responseText: {
    color: theme.colors.text,
    lineHeight: 24,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  fileBadge: {
    backgroundColor: '#1A2B36',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fileBadgeText: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  fileMetaWrap: {
    flex: 1,
  },
  fileName: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  fileMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  openText: {
    color: theme.colors.gold,
    fontWeight: '700',
  },
  formBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  editor: {
    minHeight: 180,
    backgroundColor: '#0F171E',
    color: theme.colors.text,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    fontSize: 16,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: '#101A20',
    padding: 12,
    gap: 10,
  },
  uploadHeading: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  uploadMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  fileList: {
    gap: 8,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  selectedFileName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  submitStack: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
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
  closedBox: {
    backgroundColor: '#1C1717',
    borderWidth: 1,
    borderColor: '#5A2A2A',
    borderRadius: 16,
    padding: 16,
  },
  closedTitle: {
    color: '#F3B5B7',
    fontWeight: '700',
    marginBottom: 6,
  },
  closedText: {
    color: theme.colors.text,
    lineHeight: 22,
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

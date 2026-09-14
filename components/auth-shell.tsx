import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/language-switcher';
import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t, isRTL } = useLanguage();
  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.column}>
            <LanguageSwitcher variant="auth" />
            <View style={styles.header}>
              <View style={[styles.brand, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View style={styles.accentLine} />
                <Text style={styles.wordmark}>GREA</Text>
                <Text style={[styles.academy, alignment]}>{t('academyName')}</Text>
              </View>
              <Text accessibilityRole="header" style={[styles.title, alignment]}>{title}</Text>
              <Text style={[styles.subtitle, alignment]}>{subtitle}</Text>
            </View>
            <View style={styles.card}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xl },
  column: { width: '100%', maxWidth: theme.auth.maxWidth, alignSelf: 'center', gap: theme.spacing.xl },
  header: { gap: theme.spacing.xs },
  brand: { gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  accentLine: { height: 3, width: 32, backgroundColor: theme.auth.accent, borderRadius: 2 },
  wordmark: { fontSize: 28, lineHeight: 36, letterSpacing: 4, fontWeight: '800', color: theme.auth.accent, writingDirection: 'ltr' },
  academy: { ...theme.typography.caption, color: theme.auth.textSecondary },
  title: { ...theme.typography.authTitle, color: theme.auth.textPrimary },
  subtitle: { ...theme.typography.body, color: theme.auth.textSecondary },
  card: { backgroundColor: theme.auth.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.auth.cardRadius, padding: theme.spacing.md, gap: theme.spacing.lg },
});

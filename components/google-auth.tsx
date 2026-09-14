import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthError, AuthInput } from '@/components/auth-controls';
import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import { apiGoogleLogin, type ApiError } from '@/src/lib/api';
import { getGoogleIdToken } from '@/src/lib/google-auth';

function requiresLink(error: unknown): boolean {
  const apiError = error as ApiError | null;
  return apiError?.status === 409 && typeof apiError.body === 'object' && apiError.body !== null
    && 'code' in apiError.body && apiError.body.code === 'grea_google_link_required';
}

export function GoogleAuth({ disabled, onBusyChange }: { disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const pendingToken = useRef<string | null>(null);
  const running = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      pendingToken.current = null;
    };
  }, []);

  async function authenticate() {
    if (disabled || running.current || (confirming && !password)) return;
    running.current = true;
    setLoading(true);
    setErrorKey('');
    onBusyChange(true);
    const linkPassword = confirming ? password : undefined;
    setPassword('');
    let idToken = pendingToken.current;
    let backendStarted = false;
    try {
      if (!idToken) idToken = await getGoogleIdToken();
      if (!active.current || !idToken) return;
      backendStarted = true;
      const payload = await apiGoogleLogin(idToken, linkPassword);
      if (!active.current) return;
      if (payload.token) {
        pendingToken.current = null;
        setConfirming(false);
        router.replace('/(tabs)');
      } else {
        setErrorKey(confirming ? 'googleLinkFailed' : 'googleSignInFailed');
      }
    } catch (error) {
      if (!active.current) return;
      if (backendStarted && requiresLink(error)) {
        pendingToken.current = idToken;
        setConfirming(true);
        if (confirming) setErrorKey('googleLinkFailed');
      } else {
        const safeKeys = ['googleSignInUnavailable', 'googlePlayServicesRequired'];
        setErrorKey(!backendStarted && error instanceof Error && safeKeys.includes(error.message)
          ? error.message : confirming ? 'googleLinkFailed' : 'googleSignInFailed');
      }
    } finally {
      running.current = false;
      if (active.current) {
        setLoading(false);
        onBusyChange(pendingToken.current !== null);
      }
    }
  }

  function cancel() {
    if (running.current) return;
    pendingToken.current = null;
    setPassword('');
    setConfirming(false);
    setErrorKey('');
    onBusyChange(false);
  }

  const alignment = { textAlign: isRTL ? 'right' as const : 'left' as const };
  return (
    <View style={styles.container}>
      <View style={styles.separator}><View style={styles.line} /><Text style={styles.muted}>{t('or')}</Text><View style={styles.line} /></View>
      {confirming ? (
        <View style={styles.linkPanel}>
          <Text accessibilityRole="header" style={[styles.label, alignment]}>{t('confirmExistingAccount')}</Text>
          <Text style={[styles.muted, alignment]}>{t('existingAccountPasswordPrompt')}</Text>
          <AuthInput
            label={t('password')}
            value={password}
            onChangeText={setPassword}
            accessibilityLabel={t('existingAccountPasswordPrompt')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={authenticate}
          />
        </View>
      ) : null}
      <AuthError message={errorKey ? t(errorKey) : ''} />
      <AuthButton
        variant={confirming ? 'primary' : 'secondary'}
        label={t(confirming ? 'confirmAndContinue' : 'continueWithGoogle')}
        loading={loading}
        disabled={disabled || loading || (confirming && !password)}
        onPress={authenticate}
        icon={!confirming ? <Ionicons name="logo-google" size={20} color={theme.auth.textPrimary} /> : undefined}
      />
      {confirming ? <AuthButton variant="text" label={t('cancel')} onPress={cancel} disabled={loading} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  separator: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  muted: { ...theme.typography.label, color: theme.auth.textSecondary },
  label: { ...theme.typography.button, color: theme.auth.textPrimary },
  linkPanel: { gap: theme.spacing.sm, padding: theme.spacing.sm, backgroundColor: theme.auth.surfaceInset, borderRadius: theme.auth.controlRadius, borderWidth: 1, borderColor: theme.auth.border },
});

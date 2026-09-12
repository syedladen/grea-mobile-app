import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
        <>
          <Text style={[styles.label, alignment]}>{t('confirmExistingAccount')}</Text>
          <Text style={[styles.muted, alignment]}>{t('existingAccountPasswordPrompt')}</Text>
          <TextInput
            style={[styles.input, alignment]}
            value={password}
            onChangeText={setPassword}
            placeholder={t('password')}
            accessibilityLabel={t('existingAccountPasswordPrompt')}
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={authenticate}
          />
        </>
      ) : null}
      {errorKey ? <Text accessibilityRole="alert" style={[styles.error, alignment]}>{t(errorKey)}</Text> : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading || (confirming && !password), busy: loading }}
        style={[styles.button, { flexDirection: isRTL ? 'row-reverse' : 'row' }, (disabled || loading) && styles.disabled]}
        disabled={disabled || loading || (confirming && !password)}
        onPress={authenticate}
      >
        {loading ? <ActivityIndicator color={theme.colors.text} /> : <>
          {!confirming ? <Ionicons name="logo-google" size={20} color={theme.colors.text} /> : null}
          <Text style={styles.label}>{t(confirming ? 'confirmAndContinue' : 'continueWithGoogle')}</Text>
        </>}
      </TouchableOpacity>
      {confirming ? <TouchableOpacity accessibilityRole="button" onPress={cancel} disabled={loading} style={styles.cancel}><Text style={styles.muted}>{t('cancel')}</Text></TouchableOpacity> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  muted: { color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  label: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  button: { alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 16, minHeight: 48, backgroundColor: theme.colors.background },
  disabled: { opacity: 0.6 },
  input: { backgroundColor: theme.colors.input, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 16, fontSize: 16 },
  error: { color: theme.colors.danger, fontSize: 14, lineHeight: 20 },
  cancel: { alignItems: 'center', padding: 12, minHeight: 48 },
});

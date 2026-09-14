import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, TextInput } from 'react-native';

import { AuthButton, AuthError, AuthInput, AuthPasswordInput } from '@/components/auth-controls';
import { AuthShell } from '@/components/auth-shell';
import { GoogleAuth } from '@/components/google-auth';
import { useLanguage } from '@/src/i18n';
import { apiLogin, getErrorMessage } from '@/src/lib/api';

export default function LoginScreen() {
  const { t } = useLanguage();
  const passwordRef = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (googleBusy) return;

    if (!identifier || !password) {
      setError(t('pleaseEnterCredentials'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = await apiLogin(identifier.trim(), password);
      if (payload.token) {
        router.replace('/(tabs)');
        return;
      }

      setError(payload.message || t('loginFailed'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t('welcomeBack')} subtitle={t('loginSubtitle')}>
      <AuthInput label={t('emailOrUsername')} value={identifier} onChangeText={setIdentifier}
        autoCapitalize="none" autoCorrect={false} autoComplete="username" returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()} submitBehavior="submit" />
      <AuthPasswordInput ref={passwordRef} label={t('password')} value={password} onChangeText={setPassword}
        autoComplete="current-password" returnKeyType="done" />
      <AuthButton variant="text" label={t('forgotPassword')}
        onPress={() => Linking.openURL('https://globalrealestateacademy.org/wp-login.php?action=lostpassword')} />
      <AuthError message={error} />
      <AuthButton label={t('login')} onPress={handleLogin} disabled={loading || googleBusy} loading={loading} />
      <GoogleAuth disabled={loading} onBusyChange={setGoogleBusy} />
      <Link href="/register" asChild>
        <AuthButton variant="secondary" label={t('createAccount')} disabled={googleBusy} />
      </Link>
    </AuthShell>
  );
}

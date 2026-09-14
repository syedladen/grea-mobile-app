import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { AuthButton, AuthError, AuthInput, AuthPasswordInput } from '@/components/auth-controls';
import { AuthShell } from '@/components/auth-shell';
import { GoogleAuth } from '@/components/google-auth';
import { useLanguage } from '@/src/i18n';
import { apiRegister, getErrorMessage } from '@/src/lib/api';

export default function RegisterScreen() {
  const { t } = useLanguage();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (googleBusy) return;

    if (!name || !email || !password || !confirmPassword) {
      setError(t('pleaseProvideDetails'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = await apiRegister(name.trim(), email.trim(), password);
      if (payload.token) {
        router.replace('/(tabs)');
        return;
      }
      setError(payload.message || t('registrationFailed'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t('registerTitle')} subtitle={t('registerSubtitle')}>
      <AuthInput label={t('fullName')} value={name} onChangeText={setName} autoComplete="name"
        returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} submitBehavior="submit" />
      <AuthInput ref={emailRef} label={t('emailAddress')} value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()} submitBehavior="submit" />
      <AuthPasswordInput ref={passwordRef} label={t('password')} value={password} onChangeText={setPassword}
        autoComplete="new-password" returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} submitBehavior="submit" />
      <AuthPasswordInput ref={confirmRef} label={t('confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword}
        autoComplete="new-password" returnKeyType="done" />
      <AuthError message={error} />
      <AuthButton label={t('createAccount')} onPress={handleRegister} disabled={loading || googleBusy} loading={loading} />
      <GoogleAuth disabled={loading} onBusyChange={setGoogleBusy} />
      <Link href="/login" asChild>
        <AuthButton variant="secondary" label={t('alreadyHaveAccount')} disabled={googleBusy} />
      </Link>
    </AuthShell>
  );
}

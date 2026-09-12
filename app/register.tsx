import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleAuth } from '@/components/google-auth';
import { LanguageSwitcher } from '@/components/language-switcher';
import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import { apiRegister, getErrorMessage } from '@/src/lib/api';

export default function RegisterScreen() {
  const { t, isRTL } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LanguageSwitcher />
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Join GREA</Text>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('registerTitle')}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('registerSubtitle')}</Text>
        </View>

        <View style={styles.card}>
          <TextInput style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]} value={name} onChangeText={setName} placeholder={t('fullName')} placeholderTextColor={theme.colors.muted} returnKeyType="next" />
          <TextInput style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]} value={email} onChangeText={setEmail} placeholder={t('emailAddress')} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={theme.colors.muted} returnKeyType="next" />

          <View style={styles.passwordWrap}>
            <TextInput style={[styles.passwordInput, { textAlign: isRTL ? 'right' : 'left' }]} value={password} onChangeText={setPassword} placeholder={t('password')} secureTextEntry={!showPassword} placeholderTextColor={theme.colors.muted} returnKeyType="next" />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((value) => !value)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordWrap}>
            <TextInput style={[styles.passwordInput, { textAlign: isRTL ? 'right' : 'left' }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('confirmPassword')} secureTextEntry={!showConfirmPassword} placeholderTextColor={theme.colors.muted} returnKeyType="done" />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword((value) => !value)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading || googleBusy}>
            {loading ? <ActivityIndicator color={theme.colors.background} /> : <Text style={styles.primaryButtonText}>{t('createAccount')}</Text>}
          </TouchableOpacity>

          <GoogleAuth disabled={loading} onBusyChange={setGoogleBusy} />

          <Link href="/login" asChild>
            <TouchableOpacity style={styles.secondaryButton} disabled={googleBusy}>
              <Text style={styles.secondaryButtonText}>{t('alreadyHaveAccount')}</Text>
            </TouchableOpacity>
          </Link>
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
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 24,
  },
  eyebrow: {
    color: theme.colors.gold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    fontWeight: '700',
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  input: {
    backgroundColor: theme.colors.input,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleAuth } from '@/components/google-auth';
import { LanguageSwitcher } from '@/components/language-switcher';
import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';
import { apiLogin, getErrorMessage } from '@/src/lib/api';

export default function LoginScreen() {
  const { t, isRTL } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LanguageSwitcher />
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Global Real Estate Academy</Text>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('welcomeBack')}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('loginSubtitle')}</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={t('emailOrUsername')}
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder={t('password')}
              placeholderTextColor={theme.colors.muted}
              secureTextEntry={!showPassword}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((value) => !value)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => Linking.openURL('https://globalrealestateacademy.org/wp-login.php?action=lostpassword')}>
            <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading || googleBusy}>
            {loading ? <ActivityIndicator color={theme.colors.background} /> : <Text style={styles.primaryButtonText}>{t('login')}</Text>}
          </TouchableOpacity>

          <GoogleAuth disabled={loading} onBusyChange={setGoogleBusy} />

          <Link href="/register" asChild>
            <TouchableOpacity style={styles.secondaryButton} disabled={googleBusy}>
              <Text style={styles.secondaryButtonText}>{t('createAccount')}</Text>
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
    fontSize: 36,
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
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  input: {
    backgroundColor: theme.colors.input,
    color: theme.colors.text,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.input,
    borderColor: theme.colors.border,
    borderWidth: 1,
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
  forgotText: {
    color: theme.colors.gold,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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

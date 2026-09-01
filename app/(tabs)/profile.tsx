import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import { apiGetMe, apiLogout, clearStoredToken, decodeHtmlEntities, getErrorMessage, getStoredToken, resolveAvatarUrl, resolveDisplayName } from '@/src/lib/api';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadProfile() {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const response = await apiGetMe(token);
      setUser(response.user ?? response.data ?? response);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleLogout() {
    const token = await getStoredToken();
    try {
      if (token) {
        await apiLogout(token);
      }
    } catch {
      // ignore logout failures and always clear local session
    } finally {
      await clearStoredToken();
      router.replace('/login');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
        ) : (
          <View style={styles.card}>
            {resolveAvatarUrl(user) ? (
              <Image source={{ uri: resolveAvatarUrl(user) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(resolveDisplayName(user) || 'S').slice(0, 1).toUpperCase()}</Text></View>
            )}
            <Text style={styles.name}>{decodeHtmlEntities(resolveDisplayName(user))}</Text>
            <Text style={styles.email}>{user?.email || 'No email available'}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
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
    gap: 18,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  loadingBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1B2732',
    borderWidth: 2,
    borderColor: theme.colors.gold,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.background,
    fontSize: 28,
    fontWeight: '800',
  },
  name: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  email: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: '#2A1616',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#603333',
  },
  logoutButtonText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 16,
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

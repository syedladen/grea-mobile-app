import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { apiGetCourses, apiGetMe, apiLogout, clearStoredToken, decodeHtmlEntities, getErrorMessage, getStoredToken, resolveAvatarUrl, resolveDisplayName } from '@/src/lib/api';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const [response, courseList] = await Promise.all([apiGetMe(token), apiGetCourses(token)]);
      setUser(response.user ?? response.data ?? response);
      setCourses(Array.isArray(courseList) ? courseList : []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function handleLogout() {
    const token = await getStoredToken();
    try {
      if (token) {
        await apiLogout(token);
      }
    } catch {
      // ignore
    } finally {
      await clearStoredToken();
      router.replace('/login');
    }
  }

  const totalItems = courses.reduce((sum, course) => sum + Number(course.total_items ?? 0), 0);
  const completedItems = courses.reduce((sum, course) => sum + Number(course.completed_items ?? 0), 0);
  const overallPercent = totalItems > 0 ? Math.min(100, Math.max(0, (completedItems / totalItems) * 100)) : 0;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={theme.colors.gold} size="large" /></View>
        ) : (
          <>
            <View style={styles.card}>
              {resolveAvatarUrl(user) ? (
                <Image source={{ uri: resolveAvatarUrl(user) }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{(resolveDisplayName(user) || 'S').slice(0, 1).toUpperCase()}</Text></View>
              )}
              <Text style={styles.name}>{decodeHtmlEntities(resolveDisplayName(user))}</Text>
              <Text style={styles.email}>{user?.email || 'No email available'}</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Courses</Text>
                <Text style={styles.statValue}>{courses.length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={styles.statValue}>{completedItems}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{totalItems}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Progress</Text>
                <Text style={styles.statValue}>{Math.round(overallPercent)}%</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Quick links</Text>
              <View style={styles.linkRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(tabs)/learn')}>
                  <Text style={styles.secondaryButtonText}>My Learning</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(tabs)/progress')}>
                  <Text style={styles.secondaryButtonText}>Progress</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Account</Text>
              <Text style={styles.infoRow}><Text style={styles.infoLabel}>Name:</Text> {decodeHtmlEntities(resolveDisplayName(user))}</Text>
              <Text style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text> {user?.email || 'No email available'}</Text>
              <Text style={styles.infoRow}><Text style={styles.infoLabel}>App:</Text> GREA Learn</Text>
              <Text style={styles.infoRow}><Text style={styles.infoLabel}>Version:</Text> {version}</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://globalrealestateacademy.org')} style={styles.siteButton}>
                <Text style={styles.siteButtonText}>Academy website</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
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
    gap: 18,
    paddingBottom: 40,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 4,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  infoRow: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  infoLabel: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  siteButton: {
    backgroundColor: '#11212B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  siteButtonText: {
    color: theme.colors.gold,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#2A1616',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#603333',
    alignItems: 'center',
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

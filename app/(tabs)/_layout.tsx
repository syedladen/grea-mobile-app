import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';

export default function TabsLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.gold,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarShowLabel: true,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIcon: ({ color, focused }) => {
          const iconName =
            route.name === 'index'
              ? focused ? 'home' : 'home-outline'
              : route.name === 'learn'
                ? focused ? 'school' : 'school-outline'
                : route.name === 'progress'
                  ? focused ? 'stats-chart' : 'stats-chart-outline'
                  : focused ? 'person-circle' : 'person-circle-outline';

          return <Ionicons name={iconName as any} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('home') }} />
      <Tabs.Screen name="learn" options={{ title: t('learn') }} />
      <Tabs.Screen name="progress" options={{ title: t('progress') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0B1016',
    borderTopWidth: 1,
    borderTopColor: '#1C2730',
    paddingTop: 6,
    paddingBottom: 6,
    height: 72,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});

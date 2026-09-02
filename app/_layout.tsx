import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import { LanguageProvider, useLanguage } from '@/src/i18n';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  return (
    <LanguageProvider>
      <RootNavigation />
    </LanguageProvider>
  );
}

function RootNavigation() {
  const { isRTL } = useLanguage();

  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="course/[id]" />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="quiz/[id]" />
          <Stack.Screen name="assignment/[id]" />
        </Stack>
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}

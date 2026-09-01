import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { theme } from '@/constants/theme';
import { apiGetMe, getStoredToken } from '@/src/lib/api';

export default function IndexScreen() {
  const [isChecked, setIsChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const token = await getStoredToken();
        if (!token) {
          if (active) {
            setIsAuthenticated(false);
            setIsChecked(true);
          }
          return;
        }

        try {
          await apiGetMe(token);
          if (active) {
            setIsAuthenticated(true);
            setIsChecked(true);
          }
        } catch {
          if (active) {
            setIsAuthenticated(false);
            setIsChecked(true);
          }
        }
      } catch {
        if (active) {
          setIsAuthenticated(false);
          setIsChecked(true);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  if (!isChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}

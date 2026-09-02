import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { I18n } from 'i18n-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager, StyleSheet } from 'react-native';

import { ar } from './ar';
import { en } from './en';

export type Language = 'en' | 'ar';

const LANGUAGE_KEY = 'grea_language';
const i18n = new I18n({ en, ar });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function normalizeLanguage(value?: string | null): Language {
  return value?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

async function getInitialLanguage(): Promise<Language> {
  const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
  return stored ? normalizeLanguage(stored) : normalizeLanguage(Localization.getLocales()[0]?.languageCode);
}

export type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  isRTL: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let active = true;
    void getInitialLanguage().then((initialLanguage) => {
      if (active) setLanguageState(initialLanguage);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = async (nextLanguage: Language) => {
    const normalized = normalizeLanguage(nextLanguage);
    i18n.locale = normalized;
    setLanguageState(normalized);
    await SecureStore.setItemAsync(LANGUAGE_KEY, normalized);
  };

  const isRTL = language === 'ar';
  i18n.locale = language;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, t: (key, options) => i18n.t(key, options) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function getDirection(isRTL: boolean) {
  return isRTL ? 'rtl' as const : 'ltr' as const;
}

export function useDirectionStyles() {
  const { isRTL } = useLanguage();
  return {
    isRTL,
    direction: getDirection(isRTL),
    textAlign: isRTL ? 'right' as const : 'left' as const,
    row: { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const },
  };
}

export const rtlStyles = StyleSheet.create({
  fill: { flex: 1 },
});

export function configureNativeDirection(isRTL: boolean) {
  I18nManager.allowRTL(isRTL);
}
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'auth' }) {
  const { language, setLanguage, t, isRTL } = useLanguage();

  return (
    <View style={[styles.wrap, variant === 'auth' && styles.authWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('language')}</Text>
      <View style={[styles.options, variant === 'auth' && styles.authOptions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: language === 'en' }}
          onPress={() => void setLanguage('en')}
          style={[styles.option, variant === 'auth' && styles.authOption, language === 'en' && styles.selected]}
        >
          <Text style={[styles.optionText, language === 'en' && styles.selectedText]}>{t('english')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: language === 'ar' }}
          onPress={() => void setLanguage('ar')}
          style={[styles.option, variant === 'auth' && styles.authOption, language === 'ar' && styles.selected]}
        >
          <Text style={[styles.optionText, language === 'ar' && styles.selectedText]}>{t('arabic')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authWrap: { flexWrap: 'wrap', rowGap: theme.spacing.sm },
  authOptions: { flexWrap: 'wrap', flexShrink: 1 },
  authOption: { minHeight: theme.auth.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.auth.controlRadius },
  wrap: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: theme.colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  options: { gap: 8 },
  option: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  selected: { borderColor: theme.colors.gold, backgroundColor: '#2A2416' },
  optionText: { color: theme.colors.muted, fontWeight: '600', fontSize: 13 },
  selectedText: { color: theme.colors.gold },
});

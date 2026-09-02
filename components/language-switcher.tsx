import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage, t, isRTL } = useLanguage();

  return (
    <View style={[styles.wrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('language')}</Text>
      <View style={[styles.options, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: language === 'en' }}
          onPress={() => void setLanguage('en')}
          style={[styles.option, language === 'en' && styles.selected]}
        >
          <Text style={[styles.optionText, language === 'en' && styles.selectedText]}>{t('english')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: language === 'ar' }}
          onPress={() => void setLanguage('ar')}
          style={[styles.option, language === 'ar' && styles.selected]}
        >
          <Text style={[styles.optionText, language === 'ar' && styles.selectedText]}>{t('arabic')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: theme.colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  options: { gap: 8 },
  option: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  selected: { borderColor: theme.colors.gold, backgroundColor: '#2A2416' },
  optionText: { color: theme.colors.muted, fontWeight: '600', fontSize: 13 },
  selectedText: { color: theme.colors.gold },
});

import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
};

export function AppHeader({ title, subtitle, onBack, action }: AppHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        {action ? <View style={styles.actionWrap}>{action}</View> : null}
      </View>
      {(title || subtitle) ? (
        <View style={styles.titleBlock}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  backText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  actionWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleBlock: {
    gap: 4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 13,
  },
});

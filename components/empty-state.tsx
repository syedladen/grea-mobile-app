import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  message?: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    gap: 8,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  message: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});

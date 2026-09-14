import { Ionicons } from '@expo/vector-icons';
import { forwardRef, ReactNode, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useLanguage } from '@/src/i18n';

export const AuthInput = forwardRef<TextInput, TextInputProps & { label: string; trailing?: ReactNode }>(
  function AuthInput({ label, trailing, style, onFocus, onBlur, ...props }, ref) {
    const { isRTL } = useLanguage();
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
        <View style={[styles.inputWrap, focused && styles.focused, props.editable === false && styles.disabled, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TextInput
            {...props}
            ref={ref}
            accessibilityLabel={props.accessibilityLabel ?? label}
            placeholderTextColor={theme.auth.textSecondary}
            selectionColor={theme.auth.accent}
            style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }, style]}
            onFocus={(event) => { setFocused(true); onFocus?.(event); }}
            onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          />
          {trailing}
        </View>
      </View>
    );
  },
);

export const AuthPasswordInput = forwardRef<TextInput, TextInputProps & { label: string }>(
  function AuthPasswordInput(props, ref) {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    return (
      <AuthInput
        {...props}
        ref={ref}
        secureTextEntry={!visible}
        trailing={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t(visible ? 'hidePassword' : 'showPassword')}: ${props.label}`}
            onPress={() => setVisible((value) => !value)}
            style={styles.reveal}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.auth.textSecondary} />
          </TouchableOpacity>
        }
      />
    );
  },
);

type AuthButtonProps = TouchableOpacityProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
  icon?: ReactNode;
};

// Forward the ref and press props so Expo Router Link asChild keeps its behavior.
export const AuthButton = forwardRef<View, AuthButtonProps>(function AuthButton(
  { label, variant = 'primary', loading = false, icon, style, disabled, accessibilityState, ...props }, ref,
) {
  const { t, isRTL } = useLanguage();
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const primary = variant === 'primary';
  return (
    <TouchableOpacity
      {...props}
      ref={ref}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled), busy: loading }}
      onPressIn={(event) => { setPressed(true); props.onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); props.onPressOut?.(event); }}
      onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
      activeOpacity={0.85}
      style={[styles.button, styles[variant], { flexDirection: isRTL ? 'row-reverse' : 'row' }, pressed && (primary ? styles.primaryPressed : styles.secondaryPressed), focused && styles.focused, disabled && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={primary ? theme.auth.textOnAccent : theme.auth.textPrimary} /> : icon}
      <Text style={[styles.buttonText, primary && styles.onAccent, variant === 'text' && styles.linkText]}>{loading ? t('loading') : label}</Text>
    </TouchableOpacity>
  );
});

export function AuthError({ message }: { message: string }) {
  const { isRTL } = useLanguage();
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
  label: { ...theme.typography.label, color: theme.auth.textPrimary },
  inputWrap: { alignItems: 'center', borderWidth: 1, borderColor: theme.auth.border, borderRadius: theme.auth.controlRadius, backgroundColor: theme.auth.surfaceInset },
  focused: { borderColor: theme.auth.focusBorder },
  input: { flex: 1, minWidth: 0, minHeight: theme.auth.controlHeight, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, color: theme.auth.textPrimary, fontSize: 16 },
  reveal: { width: theme.auth.touchTarget, minHeight: theme.auth.touchTarget, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: theme.auth.controlHeight, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.auth.controlRadius, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  primary: { backgroundColor: theme.auth.accent, borderColor: theme.auth.accent },
  secondary: { backgroundColor: theme.auth.surfaceInset, borderColor: theme.auth.border },
  text: { backgroundColor: 'transparent', borderColor: 'transparent' },
  primaryPressed: { backgroundColor: theme.auth.accentPressed },
  secondaryPressed: { backgroundColor: theme.auth.surfacePressed },
  buttonText: { ...theme.typography.button, color: theme.auth.textPrimary, textAlign: 'center', flexShrink: 1 },
  onAccent: { color: theme.auth.textOnAccent },
  linkText: { color: theme.auth.accent },
  disabled: { opacity: theme.auth.disabledOpacity },
  errorBox: { padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.auth.errorBorder, borderRadius: theme.auth.controlRadius, backgroundColor: theme.auth.errorSurface },
  errorText: { ...theme.typography.label, color: theme.auth.errorText },
});

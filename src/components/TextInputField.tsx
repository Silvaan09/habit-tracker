import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type TextInputFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  helper?: string | null;
};

export function TextInputField({ label, error, helper, style, ...props }: TextInputFieldProps) {
  const verticalAlignmentStyle = props.multiline ? styles.multilineInput : styles.singleLineInput;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, verticalAlignmentStyle, error && styles.inputError, style]}
        {...props}
      />
      {helper && !error ? <Text style={styles.helper}>{helper}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '800',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    ...typography.body,
  },
  singleLineInput: {
    height: 52,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 20,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.destructive,
  },
  helper: {
    color: colors.textMuted,
    ...typography.caption,
  },
  error: {
    color: colors.destructive,
    ...typography.caption,
    fontWeight: '700',
  },
});

import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type TextInputFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  helper?: string | null;
  autoGrow?: boolean;
  minInputHeight?: number;
  maxInputHeight?: number;
};

const SINGLE_LINE_HEIGHT = 44;
const DEFAULT_MULTILINE_MIN_HEIGHT = 44;
const DEFAULT_MULTILINE_MAX_HEIGHT = 140;
const INPUT_FONT_SIZE = 16;
const INPUT_LINE_HEIGHT = 20;
const INPUT_VERTICAL_PADDING = 10;

export function TextInputField({
  label,
  error,
  helper,
  autoGrow = false,
  minInputHeight,
  maxInputHeight = DEFAULT_MULTILINE_MAX_HEIGHT,
  onContentSizeChange,
  onChangeText,
  scrollEnabled,
  style,
  multiline,
  value,
  defaultValue,
  ...props
}: TextInputFieldProps) {
  const shouldAutoGrow = autoGrow || Boolean(multiline);
  const baseHeight = shouldAutoGrow
    ? minInputHeight ?? DEFAULT_MULTILINE_MIN_HEIGHT
    : SINGLE_LINE_HEIGHT;

  const [inputHeight, setInputHeight] = useState(baseHeight);

  const currentText =
    typeof value === 'string'
      ? value
      : typeof defaultValue === 'string'
        ? defaultValue
        : '';

  const handleChangeText = (text: string) => {
    onChangeText?.(text);

    if (shouldAutoGrow && text.length === 0) {
      setInputHeight(baseHeight);
    }
  };

  const handleContentSizeChange: TextInputProps['onContentSizeChange'] = (event) => {
    if (shouldAutoGrow) {
      const measuredHeight = Math.ceil(event.nativeEvent.contentSize.height);

      const nextHeight = Math.min(
        maxInputHeight,
        Math.max(baseHeight, measuredHeight)
      );

      setInputHeight((previous) => {
        if (Math.abs(previous - nextHeight) < 2) {
          return previous;
        }

        return nextHeight;
      });
    }

    onContentSizeChange?.(event);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        {...props}
        value={value}
        defaultValue={defaultValue}
        multiline={shouldAutoGrow}
        placeholderTextColor={colors.textSubtle}
        onChangeText={handleChangeText}
        onContentSizeChange={handleContentSizeChange}
        scrollEnabled={shouldAutoGrow ? scrollEnabled ?? false : scrollEnabled}
        style={[
          styles.input,
          shouldAutoGrow ? styles.multilineInput : styles.singleLineInput,
          shouldAutoGrow ? { minHeight: inputHeight } : { height: inputHeight },
          error && styles.inputError,
          style,
        ]}
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
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    fontSize: INPUT_FONT_SIZE,
    lineHeight: INPUT_LINE_HEIGHT,
  },
  singleLineInput: {
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  multilineInput: {
    paddingTop: INPUT_VERTICAL_PADDING,
    paddingBottom: INPUT_VERTICAL_PADDING,
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
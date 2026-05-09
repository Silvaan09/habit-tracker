import { useEffect, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';

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
const AUTOGROW_HEIGHT_BUFFER = 6;

export function TextInputField({
  label,
  error,
  helper,
  autoGrow = false,
  minInputHeight,
  maxInputHeight = DEFAULT_MULTILINE_MAX_HEIGHT,
  onContentSizeChange,
  onChangeText,
  onLayout,
  scrollEnabled,
  style,
  multiline,
  value,
  defaultValue,
  ...props
}: TextInputFieldProps) {
  const shouldAutoGrow = autoGrow;
  const isMultiline = shouldAutoGrow || Boolean(multiline);
  const baseHeight = shouldAutoGrow
    ? minInputHeight ?? DEFAULT_MULTILINE_MIN_HEIGHT
    : SINGLE_LINE_HEIGHT;
  const resolvedMaxHeight = Math.max(baseHeight, maxInputHeight);
  const minLineCount = Math.max(
    1,
    Math.floor((baseHeight - INPUT_VERTICAL_PADDING * 2) / INPUT_LINE_HEIGHT)
  );

  const [inputHeight, setInputHeight] = useState(baseHeight);
  const [inputContentWidth, setInputContentWidth] = useState(0);
  const currentText =
    typeof value === 'string'
      ? value
      : typeof defaultValue === 'string'
        ? defaultValue
        : '';

  useEffect(() => {
    if (!shouldAutoGrow || currentText.length === 0) {
      setInputHeight(baseHeight);
      return;
    }

    setInputHeight((current) => Math.min(resolvedMaxHeight, Math.max(baseHeight, current)));
  }, [baseHeight, currentText.length, resolvedMaxHeight, shouldAutoGrow]);

  const handleChangeText = (text: string) => {
    onChangeText?.(text);

    if (shouldAutoGrow && text.length === 0) {
      setInputHeight(baseHeight);
    }
  };

  const updateInputHeightForLineCount = (lineCount: number) => {
    if (!shouldAutoGrow) {
      return;
    }

    const visibleLineCount = Math.max(minLineCount, lineCount);
    const nextHeight = Math.min(
      resolvedMaxHeight,
      Math.max(
        baseHeight,
        visibleLineCount * INPUT_LINE_HEIGHT +
          INPUT_VERTICAL_PADDING * 2 +
          AUTOGROW_HEIGHT_BUFFER
      )
    );

    setInputHeight((previous) => {
      if (Math.abs(previous - nextHeight) < 2) {
        return previous;
      }

      return nextHeight;
    });
  };

  const handleContentSizeChange: TextInputProps['onContentSizeChange'] = (event) => {
    onContentSizeChange?.(event);
  };

  const handleInputLayout: TextInputProps['onLayout'] = (event) => {
    if (shouldAutoGrow) {
      setInputContentWidth(
        Math.max(0, Math.floor(event.nativeEvent.layout.width - spacing.md * 2))
      );
    }

    onLayout?.(event);
  };

  const handleMirrorTextLayout: TextProps['onTextLayout'] = (event) => {
    updateInputHeightForLineCount(event.nativeEvent.lines.length);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {shouldAutoGrow ? (
        <View
          onLayout={handleInputLayout}
          style={[
            styles.autoGrowShell,
            error && styles.inputError,
            style as StyleProp<ViewStyle>,
            { height: inputHeight },
          ]}>
          <TextInput
            {...props}
            value={value}
            defaultValue={defaultValue}
            multiline
            placeholderTextColor={colors.textSubtle}
            onChangeText={handleChangeText}
            onContentSizeChange={handleContentSizeChange}
            scrollEnabled={false}
            style={styles.autoGrowInput}
          />
          <Text
            aria-hidden
            pointerEvents="none"
            onTextLayout={handleMirrorTextLayout}
            style={[styles.inputMeasureText, inputContentWidth > 0 && { width: inputContentWidth }]}>
            {currentText || ' '}
          </Text>
        </View>
      ) : (
        <TextInput
          {...props}
          value={value}
          defaultValue={defaultValue}
          multiline={isMultiline}
          placeholderTextColor={colors.textSubtle}
          onChangeText={handleChangeText}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleInputLayout}
          scrollEnabled={scrollEnabled}
          style={[
            styles.input,
            isMultiline ? styles.multilineInput : styles.singleLineInput,
            error && styles.inputError,
            style,
            { height: SINGLE_LINE_HEIGHT },
          ]}
        />
      )}

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
    includeFontPadding: false,
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
  autoGrowShell: {
    paddingHorizontal: spacing.md,
    paddingVertical: INPUT_VERTICAL_PADDING,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  autoGrowInput: {
    flex: 1,
    margin: 0,
    padding: 0,
    color: colors.text,
    fontSize: INPUT_FONT_SIZE,
    includeFontPadding: false,
    lineHeight: INPUT_LINE_HEIGHT,
    textAlignVertical: 'top',
  },
  inputMeasureText: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    opacity: 0,
    zIndex: -1,
    color: colors.text,
    fontSize: INPUT_FONT_SIZE,
    includeFontPadding: false,
    lineHeight: INPUT_LINE_HEIGHT,
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

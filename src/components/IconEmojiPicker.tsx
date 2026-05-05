import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HabitIcon } from '@/src/components/HabitIcon';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { HabitIconType } from '@/src/types/Habit';

export type HabitIconSelection = {
  iconType: HabitIconType;
  iconValue: string;
  iconLibrary: string | null;
};

type IconEmojiPickerProps = {
  visible: boolean;
  selected: HabitIconSelection;
  accentColor: string | null;
  onSelect: (selection: HabitIconSelection) => void;
  onClose: () => void;
};

type EmojiOption = {
  label: string;
  value: string;
  keywords: string;
};

type IconOption = {
  label: string;
  value: string;
  library: 'Ionicons' | 'MaterialCommunityIcons';
  keywords: string;
};

const EMOJI_OPTIONS: EmojiOption[] = [
  { label: 'Books', value: '\u{1F4DA}', keywords: 'book read study learn pages' },
  { label: 'Water', value: '\u{1F4A7}', keywords: 'water drink hydrate drop' },
  { label: 'Run', value: '\u{1F3C3}', keywords: 'run cardio exercise walk' },
  { label: 'Gym', value: '\u{1F4AA}', keywords: 'gym workout strength lift muscle' },
  { label: 'Sleep', value: '\u{1F319}', keywords: 'sleep night moon rest' },
  { label: 'Meditate', value: '\u{1F9D8}', keywords: 'meditate calm mindfulness breathe' },
  { label: 'Music', value: '\u{1F3B5}', keywords: 'music practice instrument' },
  { label: 'Write', value: '\u{270F}\u{FE0F}', keywords: 'write journal pencil notes' },
  { label: 'Heart', value: '\u{2764}\u{FE0F}', keywords: 'heart health love care' },
  { label: 'Leaf', value: '\u{1F331}', keywords: 'leaf plant nature grow' },
  { label: 'Food', value: '\u{1F34E}', keywords: 'food apple nutrition eat' },
  { label: 'Clean', value: '\u{2728}', keywords: 'clean tidy sparkle' },
  { label: 'Code', value: '\u{1F4BB}', keywords: 'code computer programming' },
  { label: 'Money', value: '\u{1F4B0}', keywords: 'money budget finance save' },
  { label: 'Sun', value: '\u{2600}\u{FE0F}', keywords: 'sun morning outside' },
  { label: 'Target', value: '\u{1F3AF}', keywords: 'target goal focus' },
  { label: 'Fire', value: '\u{1F525}', keywords: 'fire streak energy' },
  { label: 'Coffee', value: '\u{2615}', keywords: 'coffee caffeine morning' },
];

const ICON_OPTIONS: IconOption[] = [
  { label: 'Book', value: 'book-outline', library: 'Ionicons', keywords: 'read book study learn' },
  { label: 'Water', value: 'water-outline', library: 'Ionicons', keywords: 'water hydrate drink' },
  { label: 'Fitness', value: 'barbell-outline', library: 'Ionicons', keywords: 'gym lift workout' },
  { label: 'Walk', value: 'walk-outline', library: 'Ionicons', keywords: 'walk run steps' },
  { label: 'Moon', value: 'moon-outline', library: 'Ionicons', keywords: 'sleep rest night' },
  { label: 'Heart', value: 'heart-outline', library: 'Ionicons', keywords: 'heart health care' },
  { label: 'Code', value: 'code-slash-outline', library: 'Ionicons', keywords: 'code program' },
  { label: 'Music', value: 'musical-notes-outline', library: 'Ionicons', keywords: 'music practice' },
  { label: 'Pencil', value: 'pencil-outline', library: 'Ionicons', keywords: 'write journal' },
  { label: 'Leaf', value: 'leaf-outline', library: 'Ionicons', keywords: 'plant nature' },
  { label: 'Alarm', value: 'alarm-outline', library: 'Ionicons', keywords: 'alarm time reminder' },
  { label: 'Check', value: 'checkmark-done-outline', library: 'Ionicons', keywords: 'check done' },
  {
    label: 'Meditate',
    value: 'meditation',
    library: 'MaterialCommunityIcons',
    keywords: 'meditate mindfulness breathe',
  },
  {
    label: 'Dumbbell',
    value: 'dumbbell',
    library: 'MaterialCommunityIcons',
    keywords: 'dumbbell workout strength',
  },
  {
    label: 'Food',
    value: 'food-apple-outline',
    library: 'MaterialCommunityIcons',
    keywords: 'food apple nutrition',
  },
  {
    label: 'Brush',
    value: 'toothbrush-paste',
    library: 'MaterialCommunityIcons',
    keywords: 'brush teeth routine',
  },
  {
    label: 'Finance',
    value: 'cash-multiple',
    library: 'MaterialCommunityIcons',
    keywords: 'money budget finance',
  },
  {
    label: 'Clean',
    value: 'spray-bottle',
    library: 'MaterialCommunityIcons',
    keywords: 'clean tidy',
  },
];

export function IconEmojiPicker({
  visible,
  selected,
  accentColor,
  onSelect,
  onClose,
}: IconEmojiPickerProps) {
  const [mode, setMode] = useState<HabitIconType>(selected.iconType);
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredEmoji = useMemo(
    () =>
      EMOJI_OPTIONS.filter((option) =>
        `${option.label} ${option.keywords}`.toLowerCase().includes(normalizedSearch)
      ),
    [normalizedSearch]
  );
  const filteredIcons = useMemo(
    () =>
      ICON_OPTIONS.filter((option) =>
        `${option.label} ${option.keywords}`.toLowerCase().includes(normalizedSearch)
      ),
    [normalizedSearch]
  );

  function chooseEmoji(option: EmojiOption) {
    onSelect({ iconType: 'emoji', iconValue: option.value, iconLibrary: null });
    onClose();
  }

  function chooseIcon(option: IconOption) {
    onSelect({
      iconType: 'icon',
      iconValue: option.value,
      iconLibrary: option.library,
    });
    onClose();
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Choose symbol</Text>
              <Text style={styles.title}>Icon or emoji</Text>
            </View>
            <Pressable
              accessibilityLabel="Close icon picker"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.segmentedControl}>
            {(['emoji', 'icon'] as const).map((nextMode) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === nextMode }}
                key={nextMode}
                onPress={() => setMode(nextMode)}
                style={[styles.segment, mode === nextMode && styles.activeSegment]}>
                <Text style={[styles.segmentText, mode === nextMode && styles.activeSegmentText]}>
                  {nextMode === 'emoji' ? 'Emoji' : 'Icons'}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            placeholder={`Search ${mode === 'emoji' ? 'emoji' : 'icons'}`}
            placeholderTextColor={colors.textSubtle}
            onChangeText={setSearch}
            value={search}
            style={styles.searchInput}
          />

          <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
            {mode === 'emoji'
              ? filteredEmoji.map((option) => (
                  <PickerTile
                    accentColor={accentColor}
                    key={option.label}
                    label={option.label}
                    selected={
                      selected.iconType === 'emoji' && selected.iconValue === option.value
                    }
                    onPress={() => chooseEmoji(option)}>
                    <Text style={styles.emoji}>{option.value}</Text>
                  </PickerTile>
                ))
              : filteredIcons.map((option) => (
                  <PickerTile
                    accentColor={accentColor}
                    key={`${option.library}-${option.value}`}
                    label={option.label}
                    selected={
                      selected.iconType === 'icon' &&
                      selected.iconValue === option.value &&
                      selected.iconLibrary === option.library
                    }
                    onPress={() => chooseIcon(option)}>
                    <HabitIcon
                      color={accentColor}
                      iconLibrary={option.library}
                      iconType="icon"
                      iconValue={option.value}
                      size={42}
                    />
                  </PickerTile>
                ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PickerTile({
  accentColor,
  children,
  label,
  selected,
  onPress,
}: {
  accentColor: string | null;
  children: React.ReactNode;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Select ${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        selected && { borderColor: accentColor ?? colors.primary, backgroundColor: colors.primaryMuted },
        pressed && styles.pressed,
      ]}>
      {children}
      <Text numberOfLines={1} style={styles.tileLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    maxHeight: '88%',
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    ...typography.heading,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  activeSegment: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
  },
  activeSegmentText: {
    color: colors.background,
  },
  searchInput: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    ...typography.body,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  tile: {
    width: '30%',
    minWidth: 92,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emoji: {
    fontSize: 34,
  },
  tileLabel: {
    color: colors.textMuted,
    ...typography.small,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.74,
  },
});

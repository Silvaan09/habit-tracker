import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { HabitIcon } from '@/src/components/HabitIcon';
import {
  LUCIDE_HABIT_ICON_OPTIONS,
  LucideCheck,
  LucideX,
  type LucideHabitIconOption,
} from '@/src/components/lucideHabitIcons';
import { colors, radius, spacing, typography } from '@/src/theme';

export type HabitIconSelection = {
  iconType: 'icon';
  iconValue: string;
  iconLibrary: 'lucide';
};

type IconPickerProps = {
  visible: boolean;
  selected: HabitIconSelection;
  accentColor: string | null;
  onSelect: (selection: HabitIconSelection) => void;
  onClose: () => void;
};

const CATEGORIES: LucideHabitIconOption['category'][] = ['Health', 'Learning', 'Lifestyle'];

export function IconPicker({
  visible,
  selected,
  accentColor,
  onSelect,
  onClose,
}: IconPickerProps) {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredIcons = useMemo(() => {
    if (!normalizedSearch) {
      return LUCIDE_HABIT_ICON_OPTIONS;
    }

    return LUCIDE_HABIT_ICON_OPTIONS.filter((option) =>
      `${option.label} ${option.category} ${option.keywords}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  function chooseIcon(option: LucideHabitIconOption) {
    onSelect({
      iconType: 'icon',
      iconValue: option.key,
      iconLibrary: 'lucide',
    });
    onClose();
  }

  return (
    <BottomSheetModal onRequestClose={onClose} sheetStyle={styles.sheet} visible={visible}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Choose icon</Text>
          <Text style={styles.title}>Habit symbol</Text>
        </View>
        <Pressable
          accessibilityLabel="Close icon picker"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <LucideX size={22} color={colors.text} />
        </Pressable>
      </View>

      <TextInput
        accessibilityLabel="Search icons"
        onChangeText={setSearch}
        placeholder="Search health, study, water..."
        placeholderTextColor={colors.textSubtle}
        style={styles.searchInput}
        value={search}
      />

      <ScrollView contentContainerStyle={styles.iconSections} keyboardShouldPersistTaps="handled">
        {normalizedSearch ? (
          <IconGrid
            accentColor={accentColor}
            icons={filteredIcons}
            onSelect={chooseIcon}
            selected={selected}
          />
        ) : (
          CATEGORIES.map((category) => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <IconGrid
                accentColor={accentColor}
                icons={filteredIcons.filter((option) => option.category === category)}
                onSelect={chooseIcon}
                selected={selected}
              />
            </View>
          ))
        )}
      </ScrollView>
    </BottomSheetModal>
  );
}

function IconGrid({
  accentColor,
  icons,
  selected,
  onSelect,
}: {
  accentColor: string | null;
  icons: LucideHabitIconOption[];
  selected: HabitIconSelection;
  onSelect: (option: LucideHabitIconOption) => void;
}) {
  if (icons.length === 0) {
    return <Text style={styles.emptyText}>No matching icons.</Text>;
  }

  return (
    <View style={styles.grid}>
      {icons.map((option) => (
        <PickerTile
          accentColor={accentColor}
          key={option.key}
          iconKey={option.key}
          label={option.label}
          selected={selected.iconValue === option.key}
          onPress={() => onSelect(option)}
        />
      ))}
    </View>
  );
}

function PickerTile({
  accentColor,
  iconKey,
  label,
  selected,
  onPress,
}: {
  accentColor: string | null;
  iconKey: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tileAccent = accentColor ?? colors.primary;

  return (
    <Pressable
      accessibilityLabel={`Select ${label} icon`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        selected && { borderColor: tileAccent, backgroundColor: colors.primaryMuted },
        pressed && styles.pressed,
      ]}>
      <HabitIcon
        color={selected ? tileAccent : colors.surfaceMuted}
        iconLibrary="lucide"
        iconType="icon"
        iconValue={iconKey}
        size={44}
      />
      {selected ? (
        <View style={[styles.selectedBadge, { backgroundColor: tileAccent }]}>
          <LucideCheck size={12} color={colors.background} strokeWidth={3} />
        </View>
      ) : null}
      <Text numberOfLines={1} style={styles.tileLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  iconSections: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  categorySection: {
    gap: spacing.md,
  },
  categoryTitle: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    position: 'relative',
    width: '30%',
    minWidth: 92,
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  tileLabel: {
    color: colors.textMuted,
    ...typography.small,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  pressed: {
    opacity: 0.74,
  },
});

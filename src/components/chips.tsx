import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '@/theme/tokens';

export type Option<T extends string | number> = { value: T; label: string; hint?: string };

// A choice among a few options, side by side: the chosen one is the selected surface in its white
// frame, as on the theme and the web panel. With hints, each option takes a row of its own.
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const rows = options.some((o) => o.hint);
  return (
    <View style={rows ? styles.rows : styles.wrap} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.chip, rows && styles.row, selected && styles.selected, disabled && styles.disabled]}>
            <Text style={[styles.label, rows && styles.rowLabel]}>{o.label}</Text>
            {o.hint ? <Text style={styles.hint}>{o.hint}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  rows: { gap: space.xs },
  chip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface2, borderWidth: 2, borderColor: 'transparent' },
  row: { paddingVertical: 12, gap: 3 },
  selected: { backgroundColor: colors.selected, borderColor: colors.frame },
  disabled: { opacity: 0.55 },
  label: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  rowLabel: { fontFamily: fonts.semibold },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2, lineHeight: 18 },
});

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { RomSystem } from '@/batox/api';
import { colors, fonts } from '@/theme/tokens';

import { ChoiceSheet } from './choice-sheet';

const plural = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'game' : 'games'}`;

// Chooses one of Batocera's systems, as the web panel's select does: every system A to Z, as
// "Full name (folder)", in a full screen list with a search ("snes", "Super Nintendo")
export function SystemPicker({ systems, value, onChange, placeholder = 'Choose a system' }: { systems: RomSystem[]; value: RomSystem | null; onChange: (system: RomSystem) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...systems].sort((a, b) => (a.fullName || a.name).localeCompare(b.fullName || b.name)), [systems]);

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={({ pressed }) => [styles.field, value && styles.chosen, pressed && styles.pressed]}>
        <Text style={styles.name}>{value ? value.fullName || value.name : placeholder}</Text>
        <Text style={styles.info}>
          {value ? `${value.name}  ·  ${plural(value.romCount)}  ·  Change` : `${systems.length} systems`}
        </Text>
      </Pressable>
      <ChoiceSheet
        title="System"
        choices={sorted.map((s) => ({ value: s.name, label: `${s.fullName ? `${s.fullName} (${s.name})` : s.name}${s.romCount ? `  ·  ${plural(s.romCount)}` : ''}` }))}
        value={value?.name ?? null}
        visible={open}
        onClose={() => setOpen(false)}
        onPick={(name) => {
          const s = systems.find((x) => x.name === name);
          if (s) onChange(s);
          setOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: { backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 12, gap: 3, borderWidth: 2, borderColor: 'transparent' },
  chosen: { backgroundColor: colors.selected, borderColor: colors.frame },
  pressed: { backgroundColor: colors.selectedPressed },
  name: { fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  info: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
});

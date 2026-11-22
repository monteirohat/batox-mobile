import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { RomSystem } from '@/batox/api';
import { colors, fonts } from '@/theme/tokens';

// Search ignores case and accents
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Chooses one of Batocera's systems: a search over names ("snes", "Super Nintendo"), then a short
// list of matches. Systems that already have games come first.
export function SystemPicker({ systems, value, onChange, placeholder = 'Search a system' }: { systems: RomSystem[]; value: RomSystem | null; onChange: (system: RomSystem) => void; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(!value);

  const matches = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const list = words.length ? systems.filter((s) => words.every((w) => fold(`${s.fullName} ${s.name}`).includes(w))) : systems;
    return [...list].sort((a, b) => Number(b.romCount > 0) - Number(a.romCount > 0) || a.fullName.localeCompare(b.fullName)).slice(0, 12);
  }, [systems, query]);

  if (!open && value) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={({ pressed }) => [styles.chosen, pressed && styles.pressed]}>
        <Text style={styles.name}>{value.fullName}</Text>
        <Text style={styles.info}>
          {value.name}  ·  {value.romCount.toLocaleString()} {value.romCount === 1 ? 'game' : 'games'}  ·  Change
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.box}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.link}
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.search}
      />
      {matches.map((s) => (
        <Pressable
          key={s.name}
          accessibilityRole="button"
          onPress={() => {
            onChange(s);
            setOpen(false);
            setQuery('');
          }}
          style={({ pressed }) => [styles.option, s.name === value?.name && styles.selected, pressed && styles.pressed]}>
          <Text style={styles.optionName} numberOfLines={1}>
            {s.fullName}
          </Text>
          <Text style={styles.info}>
            {s.name}
            {s.romCount ? `  ·  ${s.romCount.toLocaleString()} ${s.romCount === 1 ? 'game' : 'games'}` : ''}
          </Text>
        </Pressable>
      ))}
      {matches.length === 0 ? <Text style={styles.info}>No system matches.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 5 },
  search: { minHeight: 48, paddingHorizontal: 14, backgroundColor: colors.surface2, color: colors.ink, fontFamily: fonts.regular, fontSize: 16 },
  chosen: { backgroundColor: colors.selected, borderWidth: 2, borderColor: colors.frame, paddingHorizontal: 14, paddingVertical: 12, gap: 3 },
  option: { backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 10, gap: 2, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: colors.frame },
  pressed: { backgroundColor: colors.selectedPressed },
  name: { fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  optionName: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  info: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
});

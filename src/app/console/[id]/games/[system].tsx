import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getSystemRoms, type Rom } from '@/batox/api';
import { bytes, gameName } from '@/batox/format';
import { useSavedConsole } from '@/batox/use-console';
import { Backdrop } from '@/components/backdrop';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

// Search ignores case and accents: "pokemon" finds "Pokémon"
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// The games of one system, with a search by name
export default function SystemGames() {
  const { id, system, name } = useLocalSearchParams<{ id: string; system: string; name?: string }>();
  const saved = useSavedConsole(id);
  const [roms, setRoms] = useState<Rom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!saved) return;
    getSystemRoms(saved, system)
      .then((list) => setRoms(list.map((r) => ({ ...r, name: gameName(r.name) })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch((e: Error) => setError(e.message));
  }, [saved, system]);

  const shown = useMemo(() => {
    if (!roms) return [];
    const words = fold(query).split(/\s+/).filter(Boolean);
    return words.length ? roms.filter((r) => words.every((w) => fold(r.name).includes(w))) : roms;
  }, [roms, query]);

  return (
    <Backdrop>
      <Stack.Screen options={{ title: name ?? system }} />
      {error ? (
        <Plate label="Couldn't read the games" tone="error" style={styles.top}>
          <Text style={[type.body, styles.strong]}>{error}</Text>
        </Plate>
      ) : !roms ? (
        <ActivityIndicator color={colors.ink} style={styles.loading} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          initialNumToRender={20}
          windowSize={11}
          ListHeaderComponent={
            <View style={styles.header}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${roms.length.toLocaleString()} games`}
                placeholderTextColor={colors.ink3}
                selectionColor={colors.link}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                style={styles.search}
              />
              {query ? <Text style={type.label}>{shown.length.toLocaleString()} found</Text> : null}
            </View>
          }
          ListEmptyComponent={<Text style={type.body}>{query ? 'No game matches.' : 'No games in this system.'}</Text>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/console/[id]/game/[rom]', params: { id, rom: item.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.info}>{bytes(item.size)}</Text>
            </Pressable>
          )}
        />
      )}
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  top: { marginTop: 72 },
  loading: { marginTop: 120 },
  strong: { color: colors.ink },
  list: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  header: { gap: space.xs, marginBottom: space.xs },
  search: { minHeight: 48, paddingHorizontal: 14, backgroundColor: colors.surface2, color: colors.ink, fontFamily: fonts.regular, fontSize: 16 },
  row: { backgroundColor: colors.surface, paddingHorizontal: space.m, paddingVertical: 12, gap: 2, borderWidth: 2, borderColor: 'transparent' },
  pressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  name: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  info: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink3 },
});

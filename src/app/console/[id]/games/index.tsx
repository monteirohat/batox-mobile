import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { getConsoles, type ConsoleSystem } from '@/batox/api';
import { useSavedConsole } from '@/batox/use-console';
import { Backdrop } from '@/components/backdrop';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

// The systems that have games on the console, A to Z
export default function Systems() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useSavedConsole(id);
  const [systems, setSystems] = useState<ConsoleSystem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    getConsoles(saved)
      .then(({ consoles }) =>
        setSystems(consoles.filter((c) => c.games > 0).sort((a, b) => a.fullName.localeCompare(b.fullName))),
      )
      .catch((e: Error) => setError(e.message));
  }, [saved]);

  const total = systems?.reduce((n, s) => n + s.games, 0) ?? 0;

  return (
    <Backdrop>
      {error ? (
        <Plate label="Couldn't read the games" tone="error" style={styles.top}>
          <Text style={[type.body, styles.strong]}>{error}</Text>
        </Plate>
      ) : !systems ? (
        <ActivityIndicator color={colors.ink} style={styles.loading} />
      ) : (
        <FlatList
          data={systems}
          keyExtractor={(s) => s.name}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[type.label, styles.header]}>
              {total.toLocaleString()} games in {systems.length} systems
            </Text>
          }
          ListEmptyComponent={<Text style={type.body}>No games on this console yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/console/[id]/games/[system]', params: { id, system: item.name, name: item.fullName } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.name} numberOfLines={1}>
                {item.fullName}
              </Text>
              <Text style={styles.info} numberOfLines={1}>
                {[item.manufacturer, item.releaseYear, `${item.games.toLocaleString()} ${item.games === 1 ? 'game' : 'games'}`].filter(Boolean).join('  ·  ')}
              </Text>
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
  header: { marginBottom: space.xs },
  row: { backgroundColor: colors.surface, paddingHorizontal: space.m, paddingVertical: 14, gap: 3, borderWidth: 2, borderColor: 'transparent' },
  pressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  name: { fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  info: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
});

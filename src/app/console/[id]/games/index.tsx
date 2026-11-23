import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { getConsoles, type ConsoleSystem } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { rememberConsoles } from '@/batox/console-list';
import { Backdrop } from '@/components/backdrop';
import { ConsoleCard } from '@/components/console-card';
import { Plate } from '@/components/plate';
import { colors, space, type } from '@/theme/tokens';

// The systems that have games on the console, A to Z, with their logos
export default function Systems() {
  const { id, saved } = useConsole();
  const [systems, setSystems] = useState<ConsoleSystem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    getConsoles(saved)
      .then((d) => {
        rememberConsoles(id, d);
        setSystems(d.consoles.filter((c) => c.games > 0).sort((a, b) => a.fullName.localeCompare(b.fullName)));
      })
      .catch((e: Error) => setError(e.message));
  }, [id, saved]);

  const total = systems?.reduce((n, s) => n + s.games, 0) ?? 0;

  return (
    <Backdrop>
      {error ? (
        <Plate label="Couldn't read the games" tone="error" style={styles.top}>
          <Text style={[type.body, styles.strong]}>{error}</Text>
        </Plate>
      ) : !systems || !saved ? (
        <ActivityIndicator color={colors.ink} style={styles.loading} />
      ) : (
        <FlatList
          data={systems}
          keyExtractor={(s) => s.name}
          numColumns={2}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[type.label, styles.header]}>
              {total.toLocaleString()} games in {systems.length} systems
            </Text>
          }
          ListEmptyComponent={<Text style={type.body}>No games on this console yet.</Text>}
          renderItem={({ item, index }) => (
            <View style={[styles.cell, index === systems.length - 1 && index % 2 === 0 && styles.lastOdd]}>
              <ConsoleCard
                endpoint={saved}
                system={item}
                onPress={() => router.push({ pathname: '/console/[id]/games/[system]', params: { id, system: item.name, name: item.fullName } })}
              />
            </View>
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
  columns: { gap: 5 },
  cell: { flex: 1 },
  // A last card alone in its row keeps the width of half a row
  lastOdd: { maxWidth: '50%', paddingRight: 2.5 },
});

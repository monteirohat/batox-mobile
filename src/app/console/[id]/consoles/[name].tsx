import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getConsoles, type ConsoleSystem } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { recallConsoles, rememberConsoles } from '@/batox/console-list';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { TYPE_LABEL } from '@/components/console-card';
import { ConsoleLogo } from '@/components/console-logo';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

// One system: what es_systems.cfg says about it, its games and EmulationStation's statistics, its
// ROM folder and the files it accepts; then its games, or an upload to it
export default function ConsoleDetail() {
  const { id, saved } = useConsole();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [system, setSystem] = useState<ConsoleSystem | null>(() => recallConsoles(id)?.consoles.find((c) => c.name === name) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved || system) return;
    getConsoles(saved)
      .then((d) => {
        rememberConsoles(id, d);
        const found = d.consoles.find((c) => c.name === name) ?? null;
        setSystem(found);
        if (!found) setError("Batocera doesn't know this system.");
      })
      .catch((e: Error) => setError(e.message));
  }, [id, saved, name, system]);

  const rows: [string, string, boolean?][] = system
    ? [
        ['Short name', system.name, true],
        ...(system.manufacturer ? ([['Manufacturer', system.manufacturer]] as [string, string][]) : []),
        ...(system.releaseYear ? ([['Released', String(system.releaseYear)]] as [string, string][]) : []),
        ['Type', TYPE_LABEL[system.hardware ?? ''] || system.hardware || 'Not specified'],
        ['Games', `${plural(system.games, 'game', 'games')} in BatoX`],
        ...(system.inEmulationStation
          ? ([
              ['Favorites', String(system.favorites ?? 0)],
              ['Played', plural(system.played ?? 0, 'game', 'games')],
              ...(system.hidden ? [['Hidden', plural(system.hidden, 'game', 'games')]] : []),
              ...(system.mostPlayed ? [['Most played', system.mostPlayed]] : []),
            ] as [string, string][])
          : []),
        ['ROM folder', `${system.folder ?? ''}${system.folderExists === false ? '  (not created yet)' : ''}`, true],
      ]
    : [];

  return (
    <Backdrop>
      <Stack.Screen options={{ title: system?.fullName ?? 'Console' }} />
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]}>
        {error ? (
          <Plate label="Couldn't read the console" tone="error">
            <Text style={[type.body, styles.strong]}>{error}</Text>
          </Plate>
        ) : null}
        {!system && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

        {system && saved ? (
          <>
            <View style={styles.strip}>
              <ConsoleLogo endpoint={saved} system={system} height={64} />
            </View>
            <Plate>
              {rows.map(([k, v, code]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.key}>{k}</Text>
                  <Text style={[styles.value, code && styles.code]} selectable>
                    {v}
                  </Text>
                </View>
              ))}
            </Plate>
            {system.extensions?.length ? (
              <Plate label="Accepted files">
                <View style={styles.exts}>
                  {system.extensions.map((x) => (
                    <Text key={x} style={styles.ext}>
                      {x}
                    </Text>
                  ))}
                </View>
              </Plate>
            ) : null}
            <View style={styles.actions}>
              {system.games ? (
                <Button primary label="Show games" onPress={() => router.navigate({ pathname: '/console/[id]/games', params: { id, system: system.name } })} />
              ) : null}
              <Button label="Upload games" onPress={() => router.push({ pathname: '/console/[id]/upload', params: { id, system: system.name } })} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </Backdrop>
  );
}

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  strip: { backgroundColor: colors.strip, paddingVertical: space.m, paddingHorizontal: space.s },
  row: { flexDirection: 'row', gap: space.s, alignItems: 'baseline' },
  key: { width: 110, fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  code: { fontFamily: mono, fontSize: 13 },
  exts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  ext: { fontFamily: mono, fontSize: 13, color: colors.ink, backgroundColor: colors.surface2, paddingHorizontal: 10, paddingVertical: 6 },
  actions: { gap: space.s, marginTop: space.s },
});

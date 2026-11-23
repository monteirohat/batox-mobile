import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { getRoms, getSystems, syncRoms, type Rom, type SyncResult } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { bytes, gameName } from '@/batox/format';
import { takeRomsStale } from '@/batox/rom-list';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { ChoiceSheet } from '@/components/choice-sheet';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

type Game = Rom & { title: string; folded: string };
type Library = { games: Game[]; systems: { name: string; fullName: string; count: number }[] };

const byName = new Intl.Collator(undefined, { sensitivity: 'base' });
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

// Search ignores case and accents: "pokemon" finds "Pokémon"
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Every game in the console's ROM folders, as on the web panel's Games screen: a search, a system
// (opened from Consoles with ?system=, that one comes chosen), Sync library and Upload games. A game
// opens its page, with Play on the TV. The buttons, the search and the system stay put above the list.
export default function Games() {
  const { id, saved } = useConsole();
  const params = useLocalSearchParams<{ system?: string }>();
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [system, setSystem] = useState(params.system ?? '');
  const [sheet, setSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sync, setSync] = useState<SyncResult | null>(null);

  // Opened again from Consoles with another system: that one is chosen
  const [lastParam, setLastParam] = useState(params.system);
  if (params.system !== lastParam) {
    setLastParam(params.system);
    if (params.system !== undefined) setSystem(params.system);
  }

  const load = useCallback(async () => {
    if (!saved) return;
    try {
      const [roms, systems] = await Promise.all([getRoms(saved), getSystems(saved)]);
      const games = roms.map((r) => ({ ...r, title: gameName(r.name), folded: fold(gameName(r.name)) })).sort((a, b) => byName.compare(a.title, b.title));
      const count = new Map<string, number>();
      for (const g of games) count.set(g.system, (count.get(g.system) ?? 0) + 1);
      const names = new Map(systems.map((s) => [s.name, s.fullName || s.name]));
      setLibrary({
        games,
        systems: [...count].map(([name, n]) => ({ name, fullName: names.get(name) ?? name, count: n })).sort((a, b) => byName.compare(a.fullName, b.fullName)),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [saved]);

  // Read once, then again after an upload or a deletion elsewhere
  const loaded = library !== null;
  useFocusEffect(
    useCallback(() => {
      if (takeRomsStale(id) || !loaded) void load();
    }, [id, load, loaded]),
  );

  const shown = useMemo(() => {
    if (!library) return [];
    const words = fold(query).split(/\s+/).filter(Boolean);
    return library.games.filter((g) => (!system || g.system === system) && words.every((w) => g.folded.includes(w)));
  }, [library, query, system]);

  const fullName = (name: string) => library?.systems.find((s) => s.name === name)?.fullName ?? name;
  const total = library?.games.length ?? 0;

  const runSync = async () => {
    if (!saved) return;
    setSyncing(true);
    setSync(null);
    try {
      setSync(await syncRoms(saved));
      await load();
    } catch (e) {
      Alert.alert("Couldn't sync the library", e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  if (error && !library) {
    return (
      <Backdrop>
        <View style={styles.top}>
          <Plate label="Couldn't read the games" tone="error">
            <Text style={[type.body, styles.strong]}>{error}</Text>
            <Button label="Try again" onPress={() => void load()} />
          </Plate>
        </View>
      </Backdrop>
    );
  }
  if (!library) {
    return (
      <Backdrop>
        <ActivityIndicator color={colors.ink} style={styles.loading} />
      </Backdrop>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.row2}>
        <View style={styles.half}>
          <Button label={syncing ? 'Syncing…' : 'Sync library'} onPress={() => void runSync()} disabled={syncing} />
        </View>
        <View style={styles.half}>
          <Button primary label="Upload games" onPress={() => router.navigate({ pathname: '/console/[id]/upload', params: { id, ...(system ? { system } : {}) } })} />
        </View>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={`Search ${plural(total, 'game', 'games')}`}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.link}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Search games"
        style={styles.search}
      />
      <Pressable accessibilityRole="button" onPress={() => setSheet(true)} style={({ pressed }) => [styles.picker, pressed && styles.pickerPressed]}>
        <Text style={styles.pickerValue}>{system ? fullName(system) : 'All systems'}</Text>
        <Text style={styles.pickerHint}>System  ·  Change</Text>
      </Pressable>
      <Text style={type.label}>
        {shown.length === total ? plural(total, 'game', 'games') : `${shown.length.toLocaleString()} of ${plural(total, 'game', 'games')}`}
      </Text>

      <ChoiceSheet
        title="System"
        choices={[{ value: '', label: `All systems (${total.toLocaleString()})` }, ...library.systems.map((s) => ({ value: s.name, label: `${s.fullName} (${s.count.toLocaleString()})` }))]}
        value={system}
        visible={sheet}
        onClose={() => setSheet(false)}
        onPick={(v) => {
          setSystem(v);
          setSheet(false);
        }}
      />
    </View>
  );

  // The search and the system stay at the top; only the games scroll
  return (
    <Backdrop>
      {header}
      <FlatList
        data={shown}
        keyExtractor={(g) => g.id}
        keyboardShouldPersistTaps="handled"
        style={[styles.flex, page.scroller]}
        contentContainerStyle={[styles.list, page.content]}
        initialNumToRender={20}
        windowSize={11}
        ListHeaderComponent={sync ? <SyncSummary result={sync} onClose={() => setSync(null)} /> : undefined}
        ListEmptyComponent={
          <Plate>
            <Text style={type.body}>{total ? 'No game matches.' : 'No games on this console yet. Upload some, or copy them to the console and use Sync library.'}</Text>
          </Plate>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.ink}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/console/[id]/games/game/[rom]', params: { id, rom: item.id } })}
            style={({ pressed }) => [styles.game, pressed && styles.pressed]}>
            <Text style={styles.name} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.info} numberOfLines={1}>
              {[system ? '' : fullName(item.system), bytes(item.size), item.language].filter(Boolean).join('  ·  ')}
            </Text>
          </Pressable>
        )}
      />
    </Backdrop>
  );
}

// What Sync library changed, as on the web panel: the counts, then the files worth a look
function SyncSummary({ result, onClose }: { result: SyncResult; onClose: () => void }) {
  const changed = result.added + result.updated + result.moved + result.removed;
  const lists: [string, string[]][] = [
    ['Duplicate files (same content as another game)', result.duplicates],
    ['Empty files skipped', result.skipped],
    ['Errors', result.errors],
  ];
  return (
    <Plate label={changed ? 'Library updated' : 'Nothing changed'}>
      <Text style={type.body}>
        {result.added} added  ·  {result.updated} updated  ·  {result.moved} moved  ·  {result.removed} removed  ·  {result.unchanged.toLocaleString()} unchanged, in{' '}
        {(result.durationMs / 1000).toFixed(1)} s.
      </Text>
      {lists.map(([title, items]) =>
        items?.length ? (
          <View key={title} style={styles.syncList}>
            <Text style={type.label}>
              {title} ({items.length})
            </Text>
            {items.slice(0, 10).map((f) => (
              <Text key={f} style={styles.info} numberOfLines={2}>
                {f}
              </Text>
            ))}
            {items.length > 10 ? <Text style={styles.info}>and {items.length - 10} more</Text> : null}
          </View>
        ) : null,
      )}
      <Button label="Close" onPress={onClose} />
    </Plate>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: 72 },
  loading: { marginTop: 120 },
  strong: { color: colors.ink },
  flex: { flex: 1 },
  list: { paddingBottom: space.xl, gap: 5 },
  header: { paddingTop: 72, gap: space.s, paddingBottom: space.s },
  row2: { flexDirection: 'row', gap: space.xs },
  half: { flex: 1 },
  search: { minHeight: 48, paddingHorizontal: 14, backgroundColor: colors.surface2, color: colors.ink, fontFamily: fonts.regular, fontSize: 16 },
  picker: { backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 12, gap: 3, borderWidth: 2, borderColor: 'transparent' },
  pickerPressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  pickerValue: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  pickerHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  syncList: { gap: 2 },
  game: { backgroundColor: colors.surface, paddingHorizontal: space.m, paddingVertical: 12, gap: 2, borderWidth: 2, borderColor: 'transparent' },
  pressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  name: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  info: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink3 },
});

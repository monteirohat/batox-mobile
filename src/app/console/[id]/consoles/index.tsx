import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';

import { getConsoles, type ConsoleSystem } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { recallConsoles, rememberConsoles } from '@/batox/console-list';
import { Backdrop } from '@/components/backdrop';
import { Chips } from '@/components/chips';
import { ConsoleCard, TYPE_LABEL } from '@/components/console-card';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

const TYPES = [
  { value: '', label: 'All' },
  { value: 'console', label: 'Consoles' },
  { value: 'portable', label: 'Handhelds' },
  { value: 'arcade', label: 'Arcade' },
  { value: 'computer', label: 'Computers' },
  { value: 'other', label: 'Other' },
];
const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'year', label: 'Release year' },
  { value: 'games', label: 'Most games' },
];

const typeOf = (c: ConsoleSystem) => (c.hardware && TYPE_LABEL[c.hardware] ? c.hardware : 'other');
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function compare(sort: string) {
  return (a: ConsoleSystem, b: ConsoleSystem) => {
    const byName = a.fullName.localeCompare(b.fullName);
    switch (sort) {
      case 'manufacturer':
        return (a.manufacturer || '~').localeCompare(b.manufacturer || '~') || (a.releaseYear || 9999) - (b.releaseYear || 9999) || byName;
      case 'year':
        return (a.releaseYear || 9999) - (b.releaseYear || 9999) || byName;
      case 'games':
        return b.games - a.games || byName;
    }
    return byName;
  };
}

// Every system Batocera can emulate, with the games BatoX knows for each and its logo, as on the
// web panel's Consoles screen
export default function Consoles() {
  const { id, saved } = useConsole();
  const [data, setData] = useState(() => recallConsoles(id) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState('name');
  const [withGames, setWithGames] = useState(true);

  const load = useCallback(async () => {
    if (!saved) return;
    try {
      const d = await getConsoles(saved);
      rememberConsoles(id, d);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [id, saved]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const list = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.consoles
      .filter((c) => (!withGames || c.games > 0) && (!kind || typeOf(c) === kind) && (!q || [c.fullName, c.name, c.manufacturer].some((v) => (v || '').toLowerCase().includes(q))))
      .sort(compare(sort));
  }, [data, search, kind, sort, withGames]);

  const counted = data?.consoles.filter((c) => c.games > 0).length ?? 0;

  const header = (
    <View style={styles.filters}>
      <Field value={search} onChangeText={setSearch} placeholder="Search by name or manufacturer" accessibilityLabel="Search consoles" />
      <Chips options={TYPES} value={kind} onChange={setKind} />
      <Text style={[type.label, styles.sortLabel]}>Sort by</Text>
      <Chips options={SORTS} value={sort} onChange={setSort} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Only consoles with games</Text>
        <Switch value={withGames} onValueChange={setWithGames} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor={colors.ink} />
      </View>
      {data ? (
        <Text style={styles.summary}>
          {plural(counted, 'console', 'consoles')} with games, out of {data.consoles.length} that Batocera can emulate.
          {data.emulationStation ? '' : ' Start EmulationStation to see play statistics.'}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Backdrop>
      {error && !data ? (
        <Plate label="Couldn't read the consoles" tone="error" style={styles.top}>
          <Text style={[type.body, styles.strong]}>{error}</Text>
        </Plate>
      ) : !data || !saved ? (
        <ActivityIndicator color={colors.ink} style={styles.loading} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.name}
          numColumns={2}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Plate>
              <Text style={type.body}>No console matches.{withGames ? ' Turn off "Only consoles with games" to see every system.' : ''}</Text>
            </Plate>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.ink} />}
          renderItem={({ item, index }) => (
            <View style={[styles.cell, index === list.length - 1 && index % 2 === 0 && styles.lastOdd]}>
              <ConsoleCard endpoint={saved} system={item} onPress={() => router.push({ pathname: '/console/[id]/consoles/[name]', params: { id, name: item.name } })} />
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
  columns: { gap: 5 },
  cell: { flex: 1 },
  // A last card alone in its row keeps the width of half a row
  lastOdd: { maxWidth: '50%', paddingRight: 2.5 },
  filters: { gap: space.s, marginBottom: space.s },
  sortLabel: { marginTop: space.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  switchLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  summary: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
});

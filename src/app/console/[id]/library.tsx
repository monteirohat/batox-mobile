import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { downloadFromLibrary, getLibrary, libraryCoverPath, mediaSource, setLibrarySource, type Library as LibraryData, type LibraryGame } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { bytes } from '@/batox/format';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { ChoiceSheet } from '@/components/choice-sheet';
import { Chips } from '@/components/chips';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

const GUIDE = 'https://github.com/monteirohat/batox/blob/main/docs/library.md';
const STATUS: Record<string, string> = {
  installed: 'On the console',
  conflict: 'Another file with this name is on the console',
  unsupported: "This console can't play it",
};
const byName = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const can = (g: LibraryGame) => g.status === 'available' || g.status === 'conflict';
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

type Work = 'waiting' | 'downloading';

// Downloads games from the user's own library: a folder with a library.json index at an address
// they choose. Each game lands in its system's folder, checked against the library, with its cover
// and details in EmulationStation.
export default function Library() {
  const { saved } = useConsole();
  const [data, setData] = useState<LibraryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [reading, setReading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [system, setSystem] = useState('');
  const [systemSheet, setSystemSheet] = useState(false);
  const [show, setShow] = useState<'all' | 'missing'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<Map<string, Work>>(new Map());
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!saved) return;
      try {
        const d = await getLibrary(saved, refresh);
        setData(d);
        setUrl((u) => u || d.source);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [saved],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const saveSource = async () => {
    if (!saved) return;
    setReading(true);
    setNote(null);
    try {
      const d = await setLibrarySource(saved, url.trim());
      setData(d);
      setSelected(new Set());
      setNote(`Library read: ${plural(d.games.length, 'game', 'games')}.`);
    } catch (e) {
      Alert.alert("Couldn't read the library", e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  };

  const forget = () => {
    if (!saved) return;
    Alert.alert('Forget this library?', 'BatoX stops showing its games. Games already on the console stay there.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: async () => {
          try {
            setData(await setLibrarySource(saved, ''));
            setUrl('');
            setSelected(new Set());
            setNote(null);
          } catch (e) {
            Alert.alert("Couldn't forget the library", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const systems = useMemo(() => {
    const out: Record<string, { name: string; n: number }> = {};
    for (const g of data?.games ?? []) {
      out[g.system] ??= { name: g.systemName || g.system, n: 0 };
      out[g.system].n++;
    }
    return Object.entries(out).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [data]);

  // By name across systems, so the list isn't one system's games in folder order
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.games ?? [])
      .filter((g) => (!system || g.system === system) && (show !== 'missing' || can(g)) && (!q || g.name.toLowerCase().includes(q) || g.file.toLowerCase().includes(q)))
      .sort((a, b) => byName.compare(a.name, b.name) || byName.compare(a.file, b.file));
  }, [data, query, system, show]);

  const pickable = list.filter((g) => can(g) && !working.has(g.file));
  const allPicked = pickable.length > 0 && pickable.every((g) => selected.has(g.file));
  const togglePick = (file: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });

  // One game at a time, so the console isn't overloaded; each shows how it went
  const download = async (files: string[], overwrite = false) => {
    if (!saved || working.size || !data) return;
    setWorking(new Map(files.map((f) => [f, 'waiting' as Work])));
    setSelected((cur) => new Set([...cur].filter((f) => !files.includes(f))));
    setNote(null);
    let ok = 0;
    let pending = 0;
    const failed: string[] = [];
    const warnings: string[] = [];
    for (const f of files) {
      setWorking((cur) => new Map(cur).set(f, 'downloading'));
      const g = data.games.find((x) => x.file === f);
      try {
        const res = await downloadFromLibrary(saved, f, overwrite);
        setData((d) => (d ? { ...d, games: d.games.map((x) => (x.file === f ? { ...x, status: res.status } : x)) } : d));
        if (res.warning) warnings.push(`${g?.name ?? f}: ${res.warning}`);
        if (res.pending) pending++;
        ok++;
      } catch (e) {
        failed.push(`${g?.name ?? f}: ${e instanceof Error ? e.message : String(e)}`);
      }
      setWorking((cur) => {
        const next = new Map(cur);
        next.delete(f);
        return next;
      });
    }
    if (pending) setData((d) => (d ? { ...d, pending: (d.pending ?? 0) + pending } : d));
    if (ok) {
      const them = ok === 1 ? 'it' : 'them';
      setNote(
        pending
          ? `${plural(ok, 'game', 'games')} downloaded. A game is being played: EmulationStation shows ${them} once it ends.`
          : `${plural(ok, 'game', 'games')} downloaded. EmulationStation shows ${them} in a moment.`,
      );
    }
    if (failed.length || warnings.length) Alert.alert(failed.length ? "Some games weren't downloaded" : 'Downloaded, with a warning', [...failed, ...warnings].join('\n\n'));
  };

  const replace = (g: LibraryGame) =>
    Alert.alert('Replace the file on the console?', "A different file with this name is in the system's folder. It is replaced by the library's.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: () => void download([g.file], true) },
    ]);

  const onConsole = data?.games.filter((g) => g.status === 'installed').length ?? 0;
  const systemLabel = system ? (systems.find(([id]) => id === system)?.[1].name ?? system) : 'All systems';

  const header = (
    <View style={styles.headerBox}>
      <Text style={type.body}>
        Download games from your own library: a folder with a library.json index, at an address you choose (a GitHub repository, a NAS or a web server).{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(GUIDE)}>
          How to make one
        </Text>
        .
      </Text>

      <Plate label="Library address">
        <Text style={type.body}>The address of its library.json. Only you know it: BatoX has no library of its own.</Text>
        <Field value={url} onChangeText={setUrl} placeholder="https://…/library.json" keyboardType="url" accessibilityLabel="Address of library.json" onSubmitEditing={saveSource} />
        <Button primary label={reading ? 'Reading…' : 'Save'} onPress={saveSource} disabled={reading || !url.trim()} />
        {data?.source ? <Button label="Forget" onPress={forget} disabled={reading} /> : null}
      </Plate>

      {error ? (
        <Plate label="Couldn't read the library" tone="error">
          <Text style={[type.body, styles.strong]}>{error}</Text>
        </Plate>
      ) : null}
      {!data && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

      {data && !data.source ? (
        <Plate>
          <Text style={styles.title}>No library yet</Text>
          <Text style={type.body}>Enter the address of your library.json above.</Text>
        </Plate>
      ) : null}

      {data?.source && data.error ? (
        <Plate label="Couldn't read the library" tone="error">
          <Text style={[type.body, styles.strong]}>
            {data.error}
            {data.games.length ? ' The last copy is shown.' : ''}
          </Text>
          <Button label="Read again" onPress={() => void load(true)} />
        </Plate>
      ) : null}

      {data?.source && data.games.length ? (
        <Plate>
          <Text style={styles.title}>{data.name || 'Library'}</Text>
          <Text style={type.body}>
            {plural(data.games.length, 'game', 'games')}, {onConsole} on the console{data.skipped ? `  ·  ${data.skipped} invalid entries left out` : ''}.
            {data.pending ? ` ${plural(data.pending, 'downloaded game', 'downloaded games')} will show up in EmulationStation, with ${data.pending === 1 ? 'its' : 'their'} details, once the game in progress ends.` : ''}
          </Text>
          {!data.error ? <Button label="Read again" onPress={() => void load(true)} /> : null}
          <Field value={query} onChangeText={setQuery} placeholder="Search by name or file" accessibilityLabel="Search games" />
          <Pressable accessibilityRole="button" onPress={() => setSystemSheet(true)} style={({ pressed }) => [styles.picker, pressed && styles.pickerPressed]}>
            <Text style={styles.pickerValue}>{systemLabel}</Text>
            <Text style={styles.pickerHint}>System  ·  Change</Text>
          </Pressable>
          <Chips
            options={[
              { value: 'all', label: 'All games' },
              { value: 'missing', label: 'Not on the console' },
            ]}
            value={show}
            onChange={setShow}
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Button
                label={allPicked ? 'Clear selection' : 'Select the games shown'}
                onPress={() => setSelected((cur) => (allPicked ? new Set([...cur].filter((f) => !pickable.some((g) => g.file === f))) : new Set([...cur, ...pickable.map((g) => g.file)])))}
                disabled={!pickable.length || working.size > 0}
              />
            </View>
            <View style={styles.half}>
              <Button primary label={selected.size ? `Download ${plural(selected.size, 'game', 'games')}` : 'Download'} onPress={() => void download([...selected])} disabled={!selected.size || working.size > 0} />
            </View>
          </View>
          {note ? <Text style={styles.ok}>{note}</Text> : null}
        </Plate>
      ) : null}

      <ChoiceSheet
        title="System"
        choices={[{ value: '', label: 'All systems' }, ...systems.map(([id, s]) => ({ value: id, label: `${s.name} (${s.n})` }))]}
        value={system}
        visible={systemSheet}
        onClose={() => setSystemSheet(false)}
        onPick={(v) => {
          setSystem(v);
          setSystemSheet(false);
        }}
      />
    </View>
  );

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={data?.source ? list : []}
          keyExtractor={(g) => g.file}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            data?.source && data.games.length ? (
              <Plate>
                <Text style={type.body}>No game matches.</Text>
              </Plate>
            ) : undefined
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }} tintColor={colors.ink} />}
          renderItem={({ item: g }) => {
            const w = working.get(g.file);
            const picked = selected.has(g.file);
            const meta = [g.systemName || g.system, g.year, g.genre, bytes(g.size)].filter(Boolean).join('  ·  ');
            return (
              <View style={[styles.card, g.status === 'installed' && styles.cardDone]}>
                <View style={styles.cover}>
                  {g.coverUrl && saved ? (
                    <Image source={{ ...mediaSource(saved, libraryCoverPath(g.file)), cacheKey: `library:${saved.host}:${g.file}` }} style={styles.coverImage} contentFit="contain" transition={150} recyclingKey={g.file} />
                  ) : (
                    <Text style={styles.coverText}>{g.system}</Text>
                  )}
                </View>
                <View style={styles.info}>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: picked, disabled: !can(g) || !!w }} disabled={!can(g) || !!w} onPress={() => togglePick(g.file)} style={styles.pick}>
                    {can(g) && !w ? (
                      <View style={[styles.box, picked && styles.boxOn]}>{picked ? <Text style={styles.check}>✓</Text> : null}</View>
                    ) : null}
                    <Text style={styles.name}>{g.name}</Text>
                  </Pressable>
                  <Text style={styles.meta}>{meta}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {g.file.split('/').pop()}
                  </Text>
                  {g.description ? (
                    <Text style={styles.desc} numberOfLines={3}>
                      {g.description}
                    </Text>
                  ) : null}
                  {w === 'downloading' ? (
                    <View style={styles.state}>
                      <ActivityIndicator color={colors.ink} size="small" />
                      <Text style={styles.stateText}>Downloading…</Text>
                    </View>
                  ) : w === 'waiting' ? (
                    <Text style={styles.stateText}>Waiting…</Text>
                  ) : g.status === 'installed' ? (
                    <Text style={[styles.stateText, styles.okText]}>✓ {STATUS.installed}</Text>
                  ) : g.status === 'unsupported' ? (
                    <Text style={styles.stateText}>{STATUS.unsupported}</Text>
                  ) : g.status === 'conflict' ? (
                    <>
                      <Text style={[styles.stateText, styles.warnText]}>{STATUS.conflict}</Text>
                      <Button label="Replace it" onPress={() => replace(g)} disabled={working.size > 0} />
                    </>
                  ) : (
                    <Button label="Download" onPress={() => void download([g.file])} disabled={working.size > 0} />
                  )}
                </View>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  headerBox: { gap: 5, marginBottom: 5 },
  loading: { marginTop: space.l },
  strong: { color: colors.ink },
  link: { color: colors.link },
  title: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  picker: { backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 12, gap: 3, borderWidth: 2, borderColor: 'transparent' },
  pickerPressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  pickerValue: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  pickerHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  row: { flexDirection: 'row', gap: space.xs },
  half: { flex: 1 },
  ok: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ok },
  card: { flexDirection: 'row', gap: space.s, backgroundColor: colors.surface, padding: space.s },
  cardDone: { opacity: 0.85 },
  cover: { width: 84, height: 112, backgroundColor: colors.strip, alignItems: 'center', justifyContent: 'center' },
  coverImage: { width: '100%', height: '100%' },
  coverText: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 },
  info: { flex: 1, gap: 4 },
  pick: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  box: { width: 22, height: 22, marginTop: 1, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.selected, borderColor: colors.frame },
  check: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  name: { flex: 1, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  desc: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  state: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 4 },
  stateText: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2, marginTop: 4 },
  okText: { color: colors.ok },
  warnText: { color: colors.signal },
});

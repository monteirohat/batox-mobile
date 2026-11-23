import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { deleteMusic, getMusic, getSystems, type MusicLibrary, type RomSystem } from '@/batox/api';
import { bytes } from '@/batox/format';
import { hasExtension } from '@/batox/upload';
import { useConsole } from '@/batox/console-context';
import { useUploadQueue } from '@/batox/use-upload-queue';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Plate } from '@/components/plate';
import { SystemPicker } from '@/components/system-picker';
import { UploadList } from '@/components/upload-list';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

const MAIN = '';
const OTHER = 'other system';

// EmulationStation's background music: tracks in the main folder play for every system; tracks in a
// folder named after a system play while browsing it
export default function Music() {
  const { saved } = useConsole();
  const [library, setLibrary] = useState<MusicLibrary | null>(null);
  const [systems, setSystems] = useState<RomSystem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<string>(MAIN);
  const [otherSystem, setOtherSystem] = useState<RomSystem | null>(null);
  const [overwrite, setOverwrite] = useState(false);

  const load = useCallback(() => {
    if (!saved) return;
    getMusic(saved)
      .then((lib) => {
        setLibrary(lib);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [saved]);
  const { items, add, cancel, clear, busy } = useUploadQueue(saved, load);

  useEffect(() => {
    load();
    if (saved) getSystems(saved).then(setSystems).catch(() => undefined);
  }, [saved, load]);

  const label = useCallback(
    (f: string) => {
      const name = systems.find((s) => s.name === f)?.fullName;
      return f ? (name ? `${name} (${f})` : f) : 'Main folder';
    },
    [systems],
  );
  const target = folder === OTHER ? (otherSystem?.name ?? null) : folder;

  const choose = async () => {
    if (!library || target === null) return;
    const picked = await DocumentPicker.getDocumentAsync({ type: ['audio/*', 'application/octet-stream'], multiple: true, copyToCacheDirectory: true });
    if (picked.canceled) return;
    const params = new URLSearchParams();
    if (target) params.set('folder', target);
    if (overwrite) params.set('overwrite', 'true');
    const query = params.toString();
    add(
      picked.assets.map((a) =>
        hasExtension(a.name, library.extensions)
          ? { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType, path: `/music${query ? `?${query}` : ''}` }
          : { uri: a.uri, name: a.name, size: a.size, refused: `Not a music file EmulationStation plays (${library.extensions.join(' ')})` },
      ),
    );
  };

  const remove = (path: string, name: string) => {
    if (!saved) return;
    Alert.alert(`Delete ${name}?`, 'The track is deleted from the console.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMusic(saved, path);
          } catch (e) {
            Alert.alert("Couldn't delete the track", e instanceof Error ? e.message : String(e));
          }
          load();
        },
      },
    ]);
  };

  const groups = useMemo(() => {
    const map = new Map<string, MusicLibrary['tracks']>();
    for (const t of library?.tracks ?? []) map.set(t.folder, [...(map.get(t.folder) ?? []), t]);
    return [...map.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : label(a).localeCompare(label(b))));
  }, [library, label]);

  const folderOptions = [
    { value: MAIN, label: 'Main folder' },
    ...(library?.folders ?? []).map((f) => ({ value: f, label: label(f) })),
    { value: OTHER, label: 'Another system…' },
  ];
  const done = items.filter((i) => i.state === 'done').length;

  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} keyboardShouldPersistTaps="handled">
        {error ? (
          <Plate label="Couldn't read the music" tone="error">
            <Text style={[type.body, styles.strong]}>{error}</Text>
          </Plate>
        ) : null}

        <Plate>
          <Text style={type.title}>Background music</Text>
          <Text style={type.body}>EmulationStation plays these while you browse the menus.</Text>
          <Text style={type.label}>Folder</Text>
          <Chips options={folderOptions} value={folder} onChange={setFolder} />
          {folder === OTHER ? <SystemPicker systems={systems} value={otherSystem} onChange={setOtherSystem} /> : null}
          <Text style={styles.hint}>
            {target === null
              ? 'Choose the system whose menus the tracks play in.'
              : target
                ? `Goes to music/${target} and plays while browsing ${label(target)}, when system music is on in EmulationStation's sound settings.`
                : 'Plays for every system.'}
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Replace tracks with the same name</Text>
            <Switch value={overwrite} onValueChange={setOverwrite} trackColor={{ true: colors.selected, false: colors.outline }} thumbColor={overwrite ? colors.frame : colors.ink2} />
          </View>
          <Button primary label="Choose tracks" onPress={choose} disabled={!library || target === null} />
        </Plate>

        {items.length > 0 ? (
          <Plate label={busy ? 'Uploading' : `${done} of ${items.length} sent`}>
            <UploadList items={items} />
            {busy ? <Button danger label="Cancel" onPress={cancel} /> : <Button label="Clear the list" onPress={clear} />}
          </Plate>
        ) : null}

        {!library && !error ? <ActivityIndicator color={colors.ink} /> : null}
        {library && library.tracks.length === 0 ? (
          <Plate label="On the console">
            <Text style={type.body}>No music yet.</Text>
          </Plate>
        ) : null}
        {groups.map(([f, tracks]) => (
          <Plate key={f || 'main'} label={`${label(f)}  ·  ${tracks.length}`}>
            {tracks.map((t) => (
              <View key={t.path} style={styles.track}>
                <View style={styles.trackText}>
                  <Text style={styles.trackName} numberOfLines={2}>
                    {t.name}
                  </Text>
                  <Text style={styles.hint}>{bytes(t.size)}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${t.name}`} onPress={() => remove(t.path, t.name)} style={styles.delete}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </Plate>
        ))}
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  strong: { color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  switchLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  track: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: 4 },
  trackText: { flex: 1, gap: 2 },
  trackName: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  delete: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(252, 108, 105, 0.5)' },
  deleteText: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger },
});

import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { deleteBios, getBios, type BiosFile, type BiosList, type BiosStatus, type BiosSystem, type BiosUpload } from '@/batox/api';
import { biosFolder, biosPlaced, biosProgress, biosSummary, complete, filterBios, type BiosShow } from '@/batox/bios';
import { useConsole } from '@/batox/console-context';
import { useUploadQueue } from '@/batox/use-upload-queue';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { UploadList } from '@/components/upload-list';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

const STATUS: Record<BiosStatus, string> = { ok: 'In place', mismatch: 'Another version', missing: 'Missing' };

// The web panel's marks: a green check, an amber "!", a dashed ring
const MARK: Record<BiosStatus, string> = {
  ok: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${colors.ok}"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="${colors.bg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  mismatch: `<svg viewBox="0 0 24 24" fill="none" stroke="${colors.signal}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>`,
  missing: `<svg viewBox="0 0 24 24" fill="none" stroke="${colors.ink3}" stroke-width="2" stroke-dasharray="3 3"><circle cx="12" cy="12" r="9"/></svg>`,
};

const SHOW = [
  { value: 'all' as const, label: 'All' },
  { value: 'incomplete' as const, label: 'Missing files' },
  { value: 'complete' as const, label: 'Complete' },
];

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

// The BIOS files each system needs, from Batocera's own list (the one of EmulationStation's Missing
// BIOS Check), as on the web panel's BIOS screen: a check on those in place, files of any system
// sent at once (BatoX recognizes them by their content, whatever their name), and a file in another
// version deleted. Opened from a console's screen with ?system=, it shows that system.
export default function Bios() {
  const { saved } = useConsole();
  const { system: only } = useLocalSearchParams<{ system?: string }>();
  const [list, setList] = useState<BiosList | null>(null);
  const [error, setError] = useState<{ label: string; message: string } | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [show, setShow] = useState<BiosShow>('all');
  const [withGames, setWithGames] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    if (!saved) return;
    getBios(saved)
      .then((l) => {
        setList(l);
        setError(null);
      })
      .catch((e: Error & { status?: number }) =>
        setError(
          e.status === 404
            ? { label: 'Update BatoX', message: "This console's BatoX doesn't have the BIOS list yet. Update BatoX on the console to the latest version." }
            : e.status === 503
              ? { label: "Batocera's BIOS list isn't available", message: e.message }
              : { label: "Couldn't read the BIOS files", message: e.message },
        ),
      );
  }, [saved]);
  // Read again each time the screen opens: files may have changed on the web panel
  useFocusEffect(load);

  const fullName = useCallback((name: string) => list?.systems.find((s) => s.name === name)?.fullName ?? name, [list]);
  const { items, add, cancel, clear, busy } = useUploadQueue(saved, load, {
    sent: (answer) => biosPlaced(answer as BiosUpload, fullName),
    failed: (e) => (e.status === 409 ? 'A different file is already there. Turn on "Replace a different file with the same name" to replace it.' : e.message),
  });

  const choose = async () => {
    // On Android the picker's content URI can be read directly; iOS needs its own copy of the file
    const picked = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: Platform.OS === 'ios' });
    if (picked.canceled) return;
    const path = overwrite ? '/bios?overwrite=true' : '/bios';
    add(picked.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType, path })));
  };

  const remove = (file: BiosFile) => {
    if (!saved) return;
    Alert.alert(`Delete ${file.name}?`, "It isn't the version Batocera checks for. It is deleted from the console, and you can upload another one afterwards.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBios(saved, file.path);
          } catch (e) {
            Alert.alert("Couldn't delete the file", e instanceof Error ? e.message : String(e));
          }
          load();
        },
      },
    ]);
  };

  const shown = useMemo(() => {
    if (!list) return [];
    if (only) return list.systems.filter((s) => s.name === only);
    return filterBios(list.systems, { show, withGames, search });
  }, [list, only, show, withGames, search]);
  const pool = useMemo(() => (list ? list.systems.filter((s) => !withGames || s.games) : []), [list, withGames]);
  const done = items.filter((i) => i.state === 'done').length;

  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} keyboardShouldPersistTaps="handled">
        {error ? (
          <Plate label={error.label} tone="error">
            <Text style={[type.body, styles.strong]}>{error.message}</Text>
          </Plate>
        ) : null}

        <Plate>
          <Text style={type.title}>BIOS</Text>
          <Text style={type.body}>
            Some systems need files from the original hardware. Send them under any name: each goes where Batocera looks for it, recognized by its content. BatoX
            doesn&apos;t provide any BIOS files.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Replace a different file with the same name</Text>
            <Switch value={overwrite} onValueChange={setOverwrite} trackColor={{ true: colors.selected, false: colors.outline }} thumbColor={overwrite ? colors.frame : colors.ink2} />
          </View>
          <Button primary label="Choose files" onPress={choose} disabled={!list} />
        </Plate>

        {items.length > 0 ? (
          <Plate label={busy ? 'Uploading' : `${done} of ${items.length} sent`}>
            <UploadList items={items} />
            {busy ? <Button danger label="Cancel" onPress={cancel} /> : <Button label="Clear the list" onPress={clear} />}
          </Plate>
        ) : null}

        {!list && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

        {list && only ? (
          <View style={styles.actions}>
            <Button label="Show every console" onPress={() => router.setParams({ system: '' })} />
          </View>
        ) : null}

        {list && !only ? (
          <Plate>
            <Field value={search} onChangeText={setSearch} placeholder="Search by system or file name" returnKeyType="search" clearButtonMode="while-editing" />
            <Chips options={SHOW} value={show} onChange={setShow} />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Only consoles with games</Text>
              <Switch value={withGames} onValueChange={setWithGames} trackColor={{ true: colors.selected, false: colors.outline }} thumbColor={withGames ? colors.frame : colors.ink2} />
            </View>
            <Text style={styles.hint}>
              {biosSummary(pool)} Some systems list alternatives where one is enough, such as the PlayStation&apos;s BIOS versions.
            </Text>
          </Plate>
        ) : null}

        {list && shown.length === 0 ? (
          <Plate>
            <Text style={type.body}>
              {only
                ? `Batocera's list has no BIOS files for ${only} on this console.`
                : `No system matches.${withGames ? ' Turn off "Only consoles with games" to see every system.' : ''}`}
            </Text>
          </Plate>
        ) : null}

        {shown.map((s) => (
          <SystemFiles key={s.name} system={s} onDelete={remove} />
        ))}
      </ScrollView>
    </Backdrop>
  );
}

function SystemFiles({ system, onDelete }: { system: BiosSystem; onDelete: (file: BiosFile) => void }) {
  return (
    <Plate>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.system}>{system.fullName}</Text>
          <Text style={styles.hint}>
            {system.name}  ·  {system.games.toLocaleString()} {system.games === 1 ? 'game' : 'games'}
          </Text>
        </View>
        <Text style={[styles.progress, complete(system) && styles.ok]}>{biosProgress(system)}</Text>
      </View>
      {system.files.map((f) => {
        const folder = biosFolder(f.path);
        const inside = f.inside?.length ? (f.inside.length > 3 ? `${f.inside.length} files inside` : `With ${f.inside.join(', ')}`) : '';
        return (
          <View key={f.path} style={styles.file}>
            <SvgXml xml={MARK[f.status] ?? MARK.missing} width={22} height={22} />
            <View style={styles.fileText}>
              <Text style={styles.fileName} selectable>
                {f.name}
              </Text>
              {folder || inside ? <Text style={styles.hint}>{[folder, inside].filter(Boolean).join('  ·  ')}</Text> : null}
              <Text style={[styles.status, f.status === 'ok' && styles.ok, f.status === 'mismatch' && styles.warn]}>{STATUS[f.status] ?? f.status}</Text>
            </View>
            {f.status === 'mismatch' ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${f.name}`} onPress={() => onDelete(f)} style={styles.delete}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </Plate>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.l },
  strong: { color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  switchLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  actions: { gap: space.s },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  headText: { flex: 1, gap: 2 },
  system: { fontFamily: fonts.light, fontSize: 21, color: colors.ink },
  progress: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2, paddingTop: 5 },
  ok: { color: colors.ok },
  warn: { color: colors.signal },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: 10, paddingHorizontal: space.s, backgroundColor: colors.surface2 },
  fileText: { flex: 1, gap: 2 },
  fileName: { fontFamily: mono, fontSize: 14, color: colors.ink },
  status: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase', color: colors.ink2 },
  delete: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(252, 108, 105, 0.5)' },
  deleteText: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger },
});

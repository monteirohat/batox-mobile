import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { installExtension, removeExtension, restartExtension, setExtensionEnabled, getExtensions, type Extension, type Extensions } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { PERMISSIONS, installWarning, statusLine } from '@/batox/extensions';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

// The extensions installed on the console, and the official catalog's
export default function ExtensionsScreen() {
  const { id, saved } = useConsole();
  const [data, setData] = useState<Extensions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!saved) return;
      try {
        setData(await getExtensions(saved, refresh));
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

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  // Runs an action on one extension, then reads the list again
  const act = async (x: Extension, work: () => Promise<unknown>) => {
    setBusy(x.id);
    try {
      await work();
    } catch (e) {
      Alert.alert(x.name, e instanceof Error ? e.message : String(e));
    } finally {
      await load();
      setBusy(null);
    }
  };

  const install = (x: Extension) => {
    if (!saved) return;
    if (x.installed) {
      void act(x, () => installExtension(saved, x.id));
      return;
    }
    Alert.alert(`Install ${x.name}?`, installWarning(x), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Install', onPress: () => void act(x, () => installExtension(saved, x.id)) },
    ]);
  };

  const remove = (x: Extension) => {
    if (!saved) return;
    Alert.alert(`Remove ${x.name}?`, 'It stops, and its files and settings are deleted. You can install it again from the catalog.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void act(x, () => removeExtension(saved, x.id)) },
    ]);
  };

  const installed = data?.items.filter((x) => x.installed) ?? [];
  const available = data?.items.filter((x) => !x.installed) ?? [];
  const empty =
    data?.catalogState === 'unpublished'
      ? 'No extensions have been published yet.'
      : data?.catalogState === 'unreachable'
        ? "The catalog isn't available right now."
        : 'Every extension in the catalog is installed.';

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}>
        {error ? (
          <Plate label="Couldn't read the extensions" tone="error">
            <Text style={[type.body, styles.strong]}>{error}</Text>
          </Plate>
        ) : null}
        {!data && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

        {data?.catalogState === 'unreachable' ? (
          <Plate label="Couldn't reach the catalog" tone="error">
            <Text style={type.body}>
              Check that the console is connected to the internet.{installed.length ? ' Installed extensions keep working.' : ''}
            </Text>
          </Plate>
        ) : null}

        {data ? (
          <>
            <Text style={[type.label, styles.section]}>Installed  ·  start with the console when on</Text>
            {installed.length === 0 ? (
              <Plate>
                <Text style={type.body}>No extensions yet: pick one from the catalog.</Text>
              </Plate>
            ) : null}
            {installed.map((x) => {
              const status = statusLine(x);
              return (
                <Plate key={x.id}>
                  <View style={styles.head}>
                    <View style={styles.title}>
                      <Text style={styles.name}>{x.name}</Text>
                      <Text style={styles.version}>
                        Version {x.installed}
                        {x.update ? `  ·  ${x.available} available` : ''}
                      </Text>
                    </View>
                    <Chips
                      options={ON_OFF}
                      value={x.enabled ? 'on' : 'off'}
                      disabled={busy === x.id}
                      onChange={(v) => (v === 'on') !== x.enabled && void act(x, () => setExtensionEnabled(saved!, x.id, v === 'on'))}
                    />
                  </View>
                  {x.summary ? <Text style={type.body}>{x.summary}</Text> : null}
                  <View style={styles.status}>
                    <View style={[styles.dot, status.state === 'running' ? styles.dotOn : status.state === 'restarting' ? styles.dotWarn : styles.dotOff]} />
                    <Text style={styles.statusText}>{status.text}</Text>
                  </View>
                  {!x.supported ? <Text style={styles.note}>This version doesn&apos;t run on this console ({data.platform}).</Text> : null}
                  {busy === x.id ? <ActivityIndicator color={colors.ink} /> : null}
                  {x.update ? <Button primary label={`Update to ${x.available}`} onPress={() => install(x)} disabled={busy === x.id} /> : null}
                  <Button
                    label={x.settings?.length ? 'Settings and log' : 'Log'}
                    onPress={() => router.push({ pathname: '/console/[id]/extensions/[ext]', params: { id, ext: x.id } })}
                  />
                  <View style={styles.row}>
                    {x.enabled ? (
                      <View style={styles.half}>
                        <Button label="Restart" onPress={() => void act(x, () => restartExtension(saved!, x.id))} disabled={busy === x.id} />
                      </View>
                    ) : null}
                    <View style={styles.half}>
                      <Button danger label="Remove" onPress={() => remove(x)} disabled={busy === x.id} />
                    </View>
                  </View>
                </Plate>
              );
            })}

            <Text style={[type.label, styles.section]}>Catalog  ·  official extensions</Text>
            {available.length === 0 ? (
              <Plate>
                <Text style={type.body}>{empty}</Text>
              </Plate>
            ) : null}
            {available.map((x) => (
              <Plate key={x.id}>
                <Text style={styles.name}>{x.name}</Text>
                <Text style={styles.version}>Version {x.available}</Text>
                {x.summary ? <Text style={[type.body, styles.strong]}>{x.summary}</Text> : null}
                {x.description ? <Text style={type.body}>{x.description}</Text> : null}
                {(x.permissions ?? []).map((p) => (
                  <View key={p} style={styles.permission}>
                    <Text style={styles.permissionLabel}>{PERMISSIONS[p]?.[0] ?? p}</Text>
                    {PERMISSIONS[p] ? <Text style={styles.note}>{PERMISSIONS[p][1]}</Text> : null}
                  </View>
                ))}
                {!x.supported ? <Text style={styles.note}>Not available for this console ({data.platform}).</Text> : null}
                {busy === x.id ? <ActivityIndicator color={colors.ink} /> : null}
                <Button primary label="Install" onPress={() => install(x)} disabled={!x.supported || busy === x.id} />
                {x.homepage ? <Button label="Details" onPress={() => Linking.openURL(x.homepage!)} /> : null}
              </Plate>
            ))}
          </>
        ) : null}
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  section: { marginTop: space.s, marginBottom: space.xs },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  title: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  version: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: colors.ok },
  dotWarn: { backgroundColor: colors.signal },
  dotOff: { backgroundColor: colors.ink3 },
  statusText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  permission: { gap: 2, paddingLeft: space.s, borderLeftWidth: 2, borderLeftColor: colors.line },
  permissionLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  row: { flexDirection: 'row', gap: space.xs },
  half: { flex: 1 },
});

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getVideo, reboot, setVideo, type Video as VideoState, type VideoOutput } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips, type Option } from '@/components/chips';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

const ROLES: Record<string, string> = { main: 'Main screen', second: 'Second screen', off: 'Off' };

// Which screen shows EmulationStation and the games, and whether the other one stays on. Batocera
// sets the screens up when it starts, so a change applies when the console restarts.
export default function Video() {
  const { saved } = useConsole();
  const [data, setData] = useState<VideoState | null>(null);
  const [form, setForm] = useState<{ main: string; second: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!saved) return;
    try {
      const v = await getVideo(saved);
      setData(v);
      setForm({ ...v.settings });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [saved]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const label = (name: string) => data?.outputs.find((o) => o.name === name)?.monitor || name;
  const details = (o: VideoOutput) => [o.monitor ? o.name : '', o.preferredMode?.replace('x', '×') ?? ''].filter(Boolean).join('  ·  ');

  // A specific second screen needs a specific main screen, different from it
  const choose = (part: 'main' | 'second', value: string) =>
    setForm((cur) => {
      if (!cur) return cur;
      const next = { ...cur, [part]: value };
      if ((next.main === 'auto' || next.second === next.main) && next.second !== 'none') next.second = 'auto';
      return next;
    });

  const save = async () => {
    if (!saved || !form) return;
    setBusy(true);
    setNote(null);
    try {
      const v = await setVideo(saved, form);
      setData(v);
      setForm({ ...v.settings });
      setNote(v.restartNeeded ? 'Saved. Restart the console to apply it.' : 'Saved.');
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    if (!saved) return;
    Alert.alert('Restart the console?', 'Any running game will be closed without saving. The screens change during the restart, and BatoX comes back on its own in about a minute.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        style: 'destructive',
        onPress: async () => {
          try {
            await reboot(saved);
            setNote('Restarting the console.');
          } catch (e) {
            Alert.alert("Couldn't restart", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const outs = data?.outputs ?? [];
  const changed = !!data && !!form && (form.main !== data.settings.main || form.second !== data.settings.second);
  const mainOptions: Option<string>[] = [
    { value: 'auto', label: 'Automatic', hint: 'Batocera picks the first screen it finds.' },
    ...outs.map((o) => ({ value: o.name, label: label(o.name), hint: [details(o), o.role === 'main' ? 'In use now' : ''].filter(Boolean).join('  ·  ') })),
  ];
  // With two screens, the other one is the only possible second screen, so a specific choice is
  // the same as On; with more, each can be picked
  const others = form && form.main !== 'auto' ? outs.filter((o) => o.name !== form.main) : [];
  const secondOptions: Option<string>[] = [
    { value: 'auto', label: 'On', hint: 'Batocera shows artwork for the game on it (its backglass).' },
    { value: 'none', label: 'Off', hint: 'Only the main screen is used. The other one stays dark.' },
    ...(outs.length > 2 ? others.map((o) => ({ value: o.name, label: `On: ${label(o.name)}`, hint: details(o) })) : []),
  ];
  const secondValue = form ? (outs.length === 2 && form.second !== 'none' ? 'auto' : form.second) : null;

  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.ink} />}>
        <Text style={[type.body, styles.intro]}>Choose the screen that shows EmulationStation and the games, and whether the other screen stays on. Changes apply when the console restarts.</Text>

        {error ? (
          <Plate label="Couldn't read the screens" tone="error">
            <Text style={[type.body, styles.strong]}>{error}</Text>
          </Plate>
        ) : null}
        {!data && !error ? <ActivityIndicator color={colors.ink} /> : null}

        {data?.warning ? (
          <Plate label={outs.length ? 'Screens read from the system' : "Couldn't list the screens"} tone="error">
            <Text style={type.body}>
              {data.warning}
              {outs.length ? ' Saving is turned off until Batocera can list them.' : ''}
            </Text>
          </Plate>
        ) : null}

        {data && outs.length === 0 ? (
          <Plate>
            <Text style={styles.name}>No screens found</Text>
            <Text style={type.body}>Check that a screen is connected and that EmulationStation is running.</Text>
          </Plate>
        ) : null}

        {data?.restartNeeded ? (
          <Plate label="Restart the console to apply the saved settings">
            <Text style={type.body}>
              After the restart, {label(data.next.main)} becomes the main screen
              {data.next.second ? ` and ${label(data.next.second)} the second screen.` : ' and the other screens turn off.'}
            </Text>
            <Button primary label="Restart now" onPress={restart} />
          </Plate>
        ) : null}

        {outs.length ? (
          <>
            <Text style={[type.label, styles.section]}>Screens now</Text>
            <View style={styles.screens}>
              {outs.map((o) => (
                <View key={o.name} style={[styles.screen, o.role === 'main' && styles.screenMain]}>
                  <View style={[styles.tv, o.role === 'off' && styles.tvOff]}>
                    <Text style={styles.tvText}>{o.role ? ROLES[o.role] : ''}</Text>
                  </View>
                  <Text style={styles.screenName}>{o.monitor || o.name}</Text>
                  <Text style={styles.small}>{details(o)}</Text>
                  {!o.role ? <Text style={styles.small}>State unknown</Text> : null}
                </View>
              ))}
            </View>

            <Plate label="Main screen">
              <Text style={type.body}>Shows EmulationStation and the games.</Text>
              <Chips options={mainOptions} value={form?.main ?? null} onChange={(v) => choose('main', v)} />
            </Plate>
            <Plate label="Second screen">
              <Text style={type.body}>The other screen, next to the main one.</Text>
              {outs.length < 2 ? (
                <Text style={type.body}>Only one screen is connected.</Text>
              ) : (
                <Chips options={secondOptions} value={secondValue} onChange={(v) => choose('second', v)} />
              )}
            </Plate>

            {note ? <Text style={styles.ok}>{note}</Text> : null}
            <View style={styles.actions}>
              <Button primary label={busy ? 'Saving…' : 'Save'} onPress={save} disabled={!changed || busy || !!data?.warning} />
              {changed ? <Button label="Undo changes" onPress={() => data && setForm({ ...data.settings })} /> : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  intro: { marginBottom: space.s },
  strong: { color: colors.ink },
  name: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  section: { marginTop: space.xs, marginBottom: space.xs },
  screens: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  screen: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.surface, padding: space.s, gap: 4, borderWidth: 2, borderColor: 'transparent' },
  screenMain: { borderColor: colors.frame },
  tv: { aspectRatio: 16 / 9, backgroundColor: colors.selected, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, marginBottom: 4 },
  tvOff: { backgroundColor: '#05060c' },
  tvText: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink2 },
  screenName: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  ok: { fontFamily: fonts.regular, fontSize: 14, color: colors.ok, marginTop: space.xs },
  actions: { gap: space.s, marginTop: space.s },
});

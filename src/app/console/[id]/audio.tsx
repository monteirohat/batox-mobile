import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAudio, setAudio, testSound, type Audio as AudioState, type AudioOutput } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

// The same words as the web panel's Audio screen
const KINDS: Record<string, string> = { hdmi: 'HDMI', headphones: '3.5 mm jack', speakers: 'Speakers', analog: 'Analog output', bluetooth: 'Bluetooth', usb: 'USB' };
const SCREEN_ROLES: Record<string, string> = { main: 'main screen', second: 'second screen', off: 'screen turned off' };

function hint(o: AudioOutput): string {
  return [KINDS[o.kind] || o.description, o.screenRole ? SCREEN_ROLES[o.screenRole] : '', o.connected === false ? 'nothing connected' : '', o.current ? 'playing now' : '']
    .filter(Boolean)
    .join('  ·  ');
}

// Where the sound comes out: a screen over HDMI, the headphone jack, a USB or Bluetooth device.
// The change is immediate.
export default function Audio() {
  const { saved } = useConsole();
  const [data, setData] = useState<AudioState | null>(null);
  const [chosen, setChosen] = useState('auto');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!saved) return;
    try {
      const a = await getAudio(saved);
      setData(a);
      setChosen(a.setting);
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

  const labelOf = (name: string) => data?.outputs.find((o) => o.name === name)?.label ?? name;

  const apply = async (device: string) => {
    if (!saved) return;
    setBusy(true);
    setNote(null);
    try {
      const a = await setAudio(saved, device);
      setData(a);
      setChosen(a.setting);
      const now = a.outputs.find((o) => o.current);
      setNote(
        device === 'auto'
          ? 'Saved: Batocera chooses the output.'
          : now && now.name !== device
            ? `Saved, but the sound still comes out of ${now.label}.`
            : `The sound now comes out of ${labelOf(device)}.`,
      );
    } catch (e) {
      Alert.alert("Couldn't change the output", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!saved) return;
    try {
      await testSound(saved);
      setNote('Playing a test sound on the output in use.');
    } catch (e) {
      Alert.alert("Couldn't play the test sound", e instanceof Error ? e.message : String(e));
    }
  };

  const outs = data?.outputs ?? [];
  const current = outs.find((o) => o.current);
  const main = outs.find((o) => o.screenRole === 'main');
  const missing = data && data.setting !== 'auto' && !outs.some((o) => o.name === data.setting);

  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.ink} />}>
        <Text style={[type.body, styles.intro]}>Choose where the sound comes out: a screen over HDMI, the headphone jack, or a USB or Bluetooth device. The change is immediate.</Text>

        {error ? (
          <Plate label="Couldn't read the sound outputs" tone="error">
            <Text style={[type.body, styles.strong]}>{error}</Text>
          </Plate>
        ) : null}
        {!data && !error ? <ActivityIndicator color={colors.ink} /> : null}

        {data && outs.length === 0 ? (
          <Plate label={data.warning ? "Couldn't list the sound outputs" : undefined} tone={data.warning ? 'error' : undefined}>
            <Text style={styles.name}>No sound outputs found</Text>
            <Text style={type.body}>{data.warning ?? 'Check that the console has finished starting.'}</Text>
          </Plate>
        ) : null}

        {main && current && !main.current ? (
          <Plate label="The sound isn't on the main screen">
            <Text style={type.body}>
              The games are on {main.label}, but the sound comes out of {current.label}.
            </Text>
            <Button primary label={`Use ${main.label}`} onPress={() => apply(main.name)} disabled={busy} />
          </Plate>
        ) : null}

        {missing ? (
          <Plate label="The saved output isn't connected">
            <Text style={type.body}>{current ? `The sound comes out of ${current.label} until it is back.` : 'The output in use is unknown.'}</Text>
          </Plate>
        ) : null}

        {outs.length ? (
          <Plate label="Sound output">
            <Text style={type.body}>{current ? `The sound comes out of ${current.label} now.` : 'The output in use is unknown.'}</Text>
            <Button label="Play a test sound" onPress={test} />
            <Chips
              options={[
                { value: 'auto', label: 'Automatic', hint: "Batocera's choice: a Bluetooth headset when one connects, otherwise the output in use." },
                ...outs.map((o) => ({ value: o.name, label: o.label, hint: hint(o) })),
              ]}
              value={chosen}
              onChange={setChosen}
            />
            {data?.volume !== undefined ? <Text style={styles.small}>The saved volume ({data.volume}%) is applied to the output you choose.</Text> : null}
          </Plate>
        ) : null}

        {note ? <Text style={styles.ok}>{note}</Text> : null}
        {outs.length ? (
          <View style={styles.actions}>
            <Button primary label={busy ? 'Switching…' : 'Use this output'} onPress={() => apply(chosen)} disabled={busy || chosen === data?.setting} />
          </View>
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
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  ok: { fontFamily: fonts.regular, fontSize: 14, color: colors.ok, marginTop: space.xs },
  actions: { gap: space.s, marginTop: space.s },
});

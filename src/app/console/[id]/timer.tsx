import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cancelTimer, extendTimer, getTimer, startTimer, type TimerAction, type TimerCorner, type TimerStatus } from '@/batox/api';
import { clock, duration } from '@/batox/format';
import { useSavedConsole } from '@/batox/use-console';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

// The same choices as the web panel's Timer screen
const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 h' },
  { value: 90, label: '1 h 30' },
  { value: 120, label: '2 h' },
];
const ACTIONS: { value: TimerAction; label: string; hint: string; then: string }[] = [
  { value: 'close-game', label: 'Close the game', hint: "The running game closes. Progress that wasn't saved is lost.", then: 'closes the game' },
  { value: 'shutdown', label: 'Turn off the console', hint: 'The console powers off, like the Shut down button.', then: 'turns off the console' },
  { value: 'none', label: 'Just show the timer', hint: 'Nothing happens at zero: the timer only shows the time.', then: 'only shows that the time is up' },
];
const CORNERS: { value: TimerCorner; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];

// Limits play time: a countdown on the TV, then BatoX closes the game or turns the console off. The
// timer runs inside BatoX, so it keeps going when the phone is put away.
export default function TimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useSavedConsole(id);
  const [status, setStatus] = useState<TimerStatus | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState('30');
  const [action, setAction] = useState<TimerAction>('close-game');
  const [corner, setCorner] = useState<TimerCorner>('top-right');
  const [title, setTitle] = useState('Time left');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = (next: TimerStatus) => {
    setStatus(next);
    setFetchedAt(Date.now());
    setLoadError(null);
  };

  useFocusEffect(
    useCallback(() => {
      if (!saved) return;
      const load = () =>
        getTimer(saved)
          .then(show)
          .catch((e: Error) => setLoadError(e.message));
      load();
      const timer = setInterval(load, 10000);
      return () => clearInterval(timer);
    }, [saved]),
  );

  // The countdown ticks on the phone between two reads of the console
  useEffect(() => {
    if (!status?.active) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [status?.active]);

  const remaining = status?.active ? Math.max(0, status.remainingSeconds - Math.floor((now - fetchedAt) / 1000)) : 0;
  const running = status?.active ? ACTIONS.find((a) => a.value === status.action) : undefined;
  const minutesValue = Number(minutes);
  const validMinutes = Number.isInteger(minutesValue) && minutesValue >= 1 && minutesValue <= 1440;

  const run = async (work: () => Promise<TimerStatus | void>) => {
    if (!saved) return;
    setBusy(true);
    setError(null);
    try {
      const next = await work();
      show(next ?? (await getTimer(saved)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (!saved || !validMinutes) return;
    const go = () => run(() => startTimer(saved, { seconds: minutesValue * 60, action, corner, title: title.trim() }));
    if (action === 'shutdown' || status?.active) {
      const lines = [status?.active ? 'The running timer stops and this one takes its place.' : '', action === 'shutdown' ? `In ${duration(minutesValue * 60)}, the console turns off, closing any game without saving.` : ''];
      Alert.alert(status?.active ? 'Replace the running timer?' : 'Turn off the console at the end?', lines.filter(Boolean).join('\n\n'), [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start timer', style: action === 'shutdown' ? 'destructive' : 'default', onPress: go },
      ]);
    } else {
      void go();
    }
  };

  const cancel = () => {
    if (!saved) return;
    Alert.alert('Cancel the timer?', 'It disappears from the TV, and its action never runs.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel timer', style: 'destructive', onPress: () => run(async () => void (await cancelTimer(saved))) },
    ]);
  };

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!status && !loadError ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

          {loadError ? (
            <Plate label="Couldn't read the timer" tone="error">
              <Text style={[type.body, styles.strong]}>{loadError}</Text>
            </Plate>
          ) : null}

          {status?.active ? (
            <Plate label="Timer running">
              <Text style={styles.countdown}>{clock(remaining)}</Text>
              <Text style={type.body}>
                Then BatoX {running?.then ?? 'acts'}. Shown in the {CORNERS.find((c) => c.value === status.corner)?.label.toLowerCase() ?? status.corner} corner of the TV.
              </Text>
              {!status.onScreen ? (
                <Text style={styles.notice}>The timer isn&apos;t showing on the TV (the screen overlay isn&apos;t available right now), but the time limit still applies.</Text>
              ) : null}
              <View style={styles.row}>
                <View style={styles.half}>
                  <Button label="+5 min" onPress={() => run(() => extendTimer(saved!, 300))} disabled={busy} />
                </View>
                <View style={styles.half}>
                  <Button label="+15 min" onPress={() => run(() => extendTimer(saved!, 900))} disabled={busy} />
                </View>
              </View>
              <Button danger label="Cancel timer" onPress={cancel} disabled={busy} />
            </Plate>
          ) : null}

          {status ? (
            <Plate>
              <Text style={type.title}>{status.active ? 'Start a new timer' : 'Start a timer'}</Text>
              <Text style={type.body}>A countdown on the TV, on top of the game. It keeps running when you close the app.</Text>
              <Text style={type.label}>Duration</Text>
              <Chips options={DURATIONS} value={validMinutes ? minutesValue : null} onChange={(m) => setMinutes(String(m))} />
              <Field label="Minutes" value={minutes} onChangeText={(v) => setMinutes(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={4} />
              <Text style={type.label}>When the time is up</Text>
              <Chips options={ACTIONS} value={action} onChange={setAction} />
              <Text style={type.label}>Corner of the TV</Text>
              <Chips options={CORNERS} value={corner} onChange={setCorner} />
              <Field label="Title" value={title} onChangeText={setTitle} placeholder="No title" maxLength={40} autoCapitalize="sentences" />
              <Button primary label={busy ? 'Starting…' : 'Start timer'} onPress={start} disabled={busy || !validMinutes} />
              {!validMinutes ? <Text style={styles.notice}>Choose between 1 minute and 24 hours.</Text> : null}
            </Plate>
          ) : null}

          {error ? (
            <Plate label="Didn't work" tone="error">
              <Text style={[type.body, styles.strong]}>{error}</Text>
            </Plate>
          ) : null}

          {status?.last ? (
            <Plate label="Last timer">
              <Text style={type.body}>
                Ended {new Date(status.last.at).toLocaleString()}
                {status.last.error ? `, but its action failed: ${status.last.error}` : status.last.outcome ? `: ${status.last.outcome}.` : '.'}
              </Text>
            </Plate>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  countdown: { fontFamily: fonts.light, fontSize: 56, color: colors.ink, fontVariant: ['tabular-nums'] },
  notice: { fontFamily: fonts.regular, fontSize: 14, color: colors.signal, lineHeight: 20 },
  row: { flexDirection: 'row', gap: space.xs },
  half: { flex: 1 },
});

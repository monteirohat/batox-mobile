import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getEsStatus, sendMessage, type EsStatus, type MessagePosition } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

// The same choices as the web panel's Messages screen
const MAX = 500;
const PRESETS = ['Dinner is ready!', 'Time for bed.', "Five more minutes, then it's someone else's turn.", 'Please turn the volume down.'];
const POSITIONS: { value: MessagePosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];
const DURATIONS = [4, 6, 10, 15, 30, 60].map((s) => ({ value: s, label: `${s} s` }));
const TITLES = ['BatoX', 'Mom', 'Dad', 'Reminder'];

type Sent = { text: string; title: string; how: string };

// Sends a message to the TV, even in the middle of a game
export default function MessageScreen() {
  const { saved } = useConsole();
  const [es, setEs] = useState<EsStatus | null>(null);
  const [esError, setEsError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('BatoX');
  const [position, setPosition] = useState<MessagePosition>('top');
  const [seconds, setSeconds] = useState(6);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent[]>([]);

  // What the console is doing decides how the message shows
  useFocusEffect(
    useCallback(() => {
      if (!saved) return;
      const check = () =>
        getEsStatus(saved)
          .then((status) => {
            setEs(status);
            setEsError(null);
          })
          .catch((e: Error) => setEsError(e.message));
      check();
      const timer = setInterval(check, 10000);
      return () => clearInterval(timer);
    }, [saved]),
  );

  const overlay = es?.overlay === true;
  const canSend = !!saved && text.trim() !== '' && (overlay || es?.available === true) && !sending;

  const send = async () => {
    if (!saved) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendMessage(saved, overlay ? { text: text.trim(), title: title.trim(), position, seconds } : { text: text.trim() });
      const how = result.via.includes('overlay') ? 'Shown on the screen.' : "Sent to EmulationStation's menus.";
      setSent((list) => [{ text: text.trim(), title: overlay ? title.trim() : '', how }, ...list].slice(0, 10));
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const state = esError
    ? { title: 'Console unavailable', text: esError }
    : !es
      ? null
      : !es.available && !overlay
        ? { title: 'Console unavailable', text: "EmulationStation isn't running, so there is nowhere to show the message." }
        : es.runningGame
          ? { title: `Playing ${es.runningGame.name}`, text: overlay ? 'Your message shows on top of the game.' : "Without the screen overlay, the message waits for EmulationStation's menus." }
          : { title: 'The console is on the menu', text: 'Your message appears right away.' };

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} keyboardShouldPersistTaps="handled">
          <Plate label="Right now">
            {state ? (
              <>
                <Text style={styles.name}>{state.title}</Text>
                <Text style={type.body}>{state.text}</Text>
              </>
            ) : (
              <ActivityIndicator color={colors.ink} />
            )}
          </Plate>

          <Plate>
            <Text style={type.title}>Send a message</Text>
            <Field
              label={`Message  ${text.length}/${MAX}`}
              value={text}
              onChangeText={setText}
              placeholder="e.g. Dinner is ready!"
              maxLength={MAX}
              multiline
              autoCapitalize="sentences"
              autoCorrect
            />
            <Chips options={PRESETS.map((p) => ({ value: p, label: p }))} value={null} onChange={setText} />

            {overlay ? (
              <>
                <Text style={type.label}>Position</Text>
                <Chips options={POSITIONS} value={position} onChange={setPosition} />
                <Text style={type.label}>On screen for</Text>
                <Chips options={DURATIONS} value={seconds} onChange={setSeconds} />
                <Field label="Title" value={title} onChangeText={setTitle} placeholder="No title" maxLength={60} autoCapitalize="words" />
                <Chips options={[...TITLES.map((t) => ({ value: t, label: t })), { value: '', label: 'No title' }]} value={title.trim()} onChange={setTitle} />
              </>
            ) : null}

            <Button primary label={sending ? 'Sending…' : 'Send message'} onPress={send} disabled={!canSend} />
          </Plate>

          {error ? (
            <Plate label="Not sent" tone="error">
              <Text style={[type.body, styles.strong]}>{error}</Text>
            </Plate>
          ) : null}

          {sent.length > 0 ? (
            <Plate label="Sent from here">
              {sent.map((m, i) => (
                <View key={i} style={styles.sent}>
                  <Text style={styles.sentText}>{m.text}</Text>
                  <Text style={styles.sentMeta}>
                    {m.title || 'No title'}  ·  {m.how}
                  </Text>
                  <Button label="Use again" onPress={() => setText(m.text)} />
                </View>
              ))}
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
  name: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  strong: { color: colors.ink },
  sent: { gap: space.xs, paddingBottom: space.s, borderBottomWidth: 1, borderBottomColor: colors.line },
  sentText: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  sentMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
});

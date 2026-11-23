import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { consoleUrl, displayAddress } from '@/batox/address';
import { checkConnection, getAbout, type About } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

// How this phone reaches BatoX: the console's address and its access token, kept in the phone's
// secure storage; a check that both work; and the routes this version of BatoX offers
export default function Access() {
  const { saved } = useConsole();
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [about, setAbout] = useState<About | null>(null);
  const [aboutError, setAboutError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!saved) return;
      getAbout(saved)
        .then((a) => {
          setAbout(a);
          setAboutError(null);
        })
        .catch((e: Error) => setAboutError(e.message));
    }, [saved]),
  );

  const test = async () => {
    if (!saved) return;
    setTesting(true);
    setResult(null);
    try {
      await checkConnection(saved);
      setResult({ ok: true, text: 'BatoX answered and accepted the token.' });
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  const copy = async () => {
    if (!saved) return;
    await Clipboard.setStringAsync(saved.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // The web panel's own files answer on every path ("/*"): only the API's routes are listed
  const routes = about?.endpoints.filter((r) => r.path !== '/*') ?? [];

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/wordmark.png')} style={styles.wordmark} contentFit="contain" accessibilityLabel="BatoX" />
          <Text style={type.title}>API access</Text>
          <Text style={type.body}>This phone reaches BatoX on the console with this address and token. They are kept in the phone&apos;s secure storage only.</Text>
        </View>

        {saved ? (
          <Plate>
            <Text style={type.label}>API address</Text>
            <Text style={styles.value} selectable>
              {consoleUrl(saved)}api/v1
            </Text>
            <Text style={[type.label, styles.gap]}>Token</Text>
            <Text style={styles.value} selectable={reveal}>
              {reveal ? saved.token : '•'.repeat(Math.min(saved.token.length, 24))}
            </Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <Button label={reveal ? 'Hide' : 'Show'} onPress={() => setReveal((r) => !r)} />
              </View>
              <View style={styles.half}>
                <Button label={copied ? 'Copied' : 'Copy token'} onPress={copy} />
              </View>
            </View>
            <Text style={styles.hint}>The token is also on the console, in /userdata/system/batox/token.</Text>
            <Button primary label={testing ? 'Testing…' : 'Test the connection'} onPress={test} disabled={testing} />
            {result ? <Text style={[styles.result, result.ok ? styles.ok : styles.error]}>{result.ok ? `All set: ${result.text}` : result.text}</Text> : null}
            <Button label="Change the token" onPress={() => router.push({ pathname: '/connect', params: { address: displayAddress(saved) } })} />
            <Button label="Open BatoX in the browser" onPress={() => Linking.openURL(consoleUrl(saved))} />
          </Plate>
        ) : (
          <ActivityIndicator color={colors.ink} />
        )}

        <Plate label="API routes">
          {about ? (
            <Text style={type.body}>
              Everything BatoX {about.version} on {about.platform} offers.
            </Text>
          ) : null}
          {aboutError ? <Text style={[type.body, styles.strong]}>{aboutError}</Text> : null}
          {!about && !aboutError ? <ActivityIndicator color={colors.ink} /> : null}
          {routes.map((r) => (
            <View key={`${r.method} ${r.path}`} style={styles.route}>
              <Text style={styles.method}>{r.method}</Text>
              <Text style={styles.path} selectable>
                {r.path}
              </Text>
            </View>
          ))}
        </Plate>
      </ScrollView>
    </Backdrop>
  );
}

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  hero: { gap: space.s, marginBottom: space.m },
  wordmark: { width: 160, aspectRatio: 1024 / 411 },
  strong: { color: colors.ink },
  value: { fontFamily: mono, fontSize: 14, color: colors.ink },
  gap: { marginTop: space.xs },
  row: { flexDirection: 'row', gap: space.xs },
  half: { flex: 1 },
  hint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  result: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  ok: { color: colors.ok },
  error: { color: colors.danger },
  route: { flexDirection: 'row', gap: space.s, paddingVertical: 3 },
  method: { width: 62, fontFamily: mono, fontSize: 12, color: colors.ink },
  path: { flex: 1, fontFamily: mono, fontSize: 12, color: colors.ink2 },
});

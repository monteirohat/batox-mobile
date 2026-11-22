import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { consoleId, getCurrentConsoleId, listConsoles } from '@/batox/consoles';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { colors, space, type } from '@/theme/tokens';

// Where the app starts: the console it used last, when the phone knows one; otherwise the welcome,
// with the two ways in
export default function Welcome() {
  // undefined while reading the saved consoles, null when there is none
  const [start, setStart] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const all = await listConsoles();
      if (all.length === 0) {
        setStart(null);
        return;
      }
      const current = await getCurrentConsoleId();
      setStart(all.some((c) => consoleId(c) === current) ? current : consoleId(all[0]));
    })();
  }, []);

  if (start === undefined) return <View style={styles.blank} />;
  if (start) return <Redirect href={{ pathname: '/console/[id]', params: { id: start } }} />;

  return (
    <Backdrop>
      <View style={styles.top}>
        <Image source={require('@/assets/images/wordmark.png')} style={styles.wordmark} contentFit="contain" accessibilityLabel="BatoX" />
        <Text style={[type.body, styles.tagline]}>Your Batocera, from your phone.</Text>
      </View>
      <View style={styles.actions}>
        <Button primary label="Install BatoX on a console" onPress={() => router.push('/install')} />
        <Button label="I already have BatoX" onPress={() => router.push('/connect')} />
      </View>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  top: { flex: 1, alignItems: 'center', paddingTop: space.xl },
  wordmark: { width: 240, aspectRatio: 1024 / 411 },
  tagline: { marginTop: space.s, textAlign: 'center' },
  actions: { gap: space.s, paddingBottom: space.m },
});

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { displayAddress } from '@/batox/address';
import { consoleId, listConsoles, type SavedConsole } from '@/batox/consoles';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { colors, fonts, space, type } from '@/theme/tokens';

// The first screen: the name over the sky, the consoles this phone knows, and the ways to add one
export default function Home() {
  const [consoles, setConsoles] = useState<SavedConsole[]>([]);

  useFocusEffect(
    useCallback(() => {
      listConsoles().then(setConsoles);
    }, []),
  );

  return (
    <Backdrop>
      <View style={styles.top}>
        <Image source={require('@/assets/images/wordmark.png')} style={styles.wordmark} contentFit="contain" accessibilityLabel="BatoX" />
        <Text style={[type.body, styles.tagline]}>Your Batocera, from your phone.</Text>
      </View>

      {consoles.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <Text style={type.label}>Your consoles</Text>
          {consoles.map((c) => (
            <Pressable
              key={consoleId(c)}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/console/[id]', params: { id: consoleId(c) } })}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
              <Text style={styles.tileName} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={styles.tileInfo} numberOfLines={1}>
                {displayAddress(c)}  ·  BatoX {c.version}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.actions}>
        <Button primary={consoles.length === 0} label="Install BatoX on a console" onPress={() => router.push('/install')} />
        <Button label={consoles.length === 0 ? 'I already have BatoX' : 'Add a console with BatoX'} onPress={() => router.push('/connect')} />
      </View>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', paddingTop: space.xl },
  wordmark: { width: 240, aspectRatio: 1024 / 411 },
  tagline: { marginTop: space.s, textAlign: 'center' },
  spacer: { flex: 1 },
  list: { flex: 1, marginTop: space.l },
  listContent: { gap: 5, paddingBottom: space.m },
  tile: { backgroundColor: colors.surface, paddingHorizontal: space.m, paddingVertical: space.m, gap: 4 },
  tilePressed: { backgroundColor: colors.selected, borderWidth: 2, borderColor: colors.frame },
  tileName: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  tileInfo: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  actions: { gap: space.s, paddingBottom: space.m },
});

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { displayAddress } from '@/batox/address';
import { consoleId, forgetConsole, getCurrentConsoleId, listConsoles, type SavedConsole } from '@/batox/consoles';
import { openConsole, openWelcome } from '@/batox/navigation';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

// The consoles this phone knows: open another one, add one, or forget one
export default function Consoles() {
  const [consoles, setConsoles] = useState<SavedConsole[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  const load = useCallback(() => {
    listConsoles().then(setConsoles);
    getCurrentConsoleId().then(setCurrent);
  }, []);
  useFocusEffect(load);

  const forget = (c: SavedConsole) => {
    Alert.alert('Forget this console?', `${c.name} and its token are removed from this phone. BatoX stays on the console.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: async () => {
          try {
            await forgetConsole(consoleId(c));
          } catch (e) {
            Alert.alert("Couldn't forget the console", e instanceof Error ? e.message : String(e));
            return;
          }
          const rest = await listConsoles();
          if (rest.length === 0) openWelcome();
          else if (consoleId(c) === current) openConsole(rest[0]);
          else load();
        },
      },
    ]);
  };

  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]}>
        <Text style={type.label}>Your consoles</Text>
        {consoles.map((c) => {
          const active = consoleId(c) === current;
          return (
            <View key={consoleId(c)} style={[styles.tile, active && styles.active]}>
              <Pressable accessibilityRole="button" onPress={() => openConsole(c)} style={styles.tileMain}>
                <Text style={styles.name} numberOfLines={2}>
                  {c.name}
                </Text>
                <Text style={styles.info} numberOfLines={2}>
                  {displayAddress(c)}  ·  BatoX {c.version}
                  {active ? '  ·  Open now' : ''}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Forget ${c.name}`} onPress={() => forget(c)} style={styles.forget}>
                <Text style={styles.forgetText}>Forget</Text>
              </Pressable>
            </View>
          );
        })}
        <View style={styles.actions}>
          <Button primary label="Add a console with BatoX" onPress={() => router.push('/connect')} />
          <Button label="Install BatoX on a console" onPress={() => router.push('/install')} />
        </View>
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  tile: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 2, borderColor: 'transparent' },
  active: { backgroundColor: colors.selected, borderColor: colors.frame },
  tileMain: { flex: 1, paddingHorizontal: space.m, paddingVertical: space.m, gap: 4 },
  name: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  info: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  forget: { paddingHorizontal: space.m, paddingVertical: space.m },
  forgetText: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger },
  actions: { gap: space.s, marginTop: space.m },
});

import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { consoleUrl, displayAddress } from '@/batox/address';
import type { SavedConsole } from '@/batox/consoles';
import { colors, fonts, space, type } from '@/theme/tokens';

import { Icon } from './icon';
import type { IconName } from './icons';

// The console's features, in the order of the web panel's menu
export const MENU: { route: string; label: string; icon: IconName }[] = [
  { route: 'index', label: 'Home', icon: 'dashboard' },
  { route: 'games', label: 'Games', icon: 'games' },
  { route: 'consoles', label: 'Consoles', icon: 'consoles' },
  { route: 'upload', label: 'Upload games', icon: 'upload' },
  { route: 'bios', label: 'BIOS', icon: 'bios' },
  { route: 'library', label: 'Library', icon: 'library' },
  { route: 'music', label: 'Music', icon: 'music' },
  { route: 'message', label: 'Messages', icon: 'messages' },
  { route: 'timer', label: 'Timer', icon: 'timer' },
  { route: 'es', label: 'EmulationStation', icon: 'es' },
  { route: 'video', label: 'Video', icon: 'video' },
  { route: 'audio', label: 'Audio', icon: 'audio' },
  { route: 'batocera', label: 'Batocera', icon: 'batocera' },
  { route: 'extensions', label: 'Extensions', icon: 'extensions' },
  { route: 'logs', label: 'Logs', icon: 'logs' },
  { route: 'access', label: 'Access', icon: 'access' },
];

// The side menu: the console it works on, its features (the open one is the selected surface in
// its white frame, as in the web panel's menu), and the ways out
export function ConsoleMenu({ state, navigation, console }: DrawerContentComponentProps & { console: SavedConsole | null | undefined }) {
  const current = state.routes[state.index]?.name;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left']}>
      <View style={styles.head}>
        <Image source={require('@/assets/images/wordmark.png')} style={styles.wordmark} contentFit="contain" accessibilityLabel="BatoX" />
        {console ? (
          <View style={styles.console}>
            <Text style={styles.consoleName} numberOfLines={2}>
              {console.name}
            </Text>
            <Text style={styles.consoleInfo}>{displayAddress(console)}</Text>
          </View>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.items}>
        {MENU.map((item) => {
          const active = current === item.route;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => navigation.navigate(item.route)}
              style={({ pressed }) => [styles.item, active && styles.active, pressed && !active && styles.pressed]}>
              <Icon name={item.icon} color={active ? colors.ink : colors.ink2} />
              <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.foot}>
        {console ? (
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(consoleUrl(console))} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Icon name="open" color={colors.ink2} />
            <Text style={styles.label}>Open BatoX in the browser</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.closeDrawer();
            router.push('/consoles');
          }}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <Icon name="switch" color={colors.ink2} />
          <Text style={styles.label}>Switch console</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.closeDrawer();
            router.push('/about');
          }}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <Icon name="about" color={colors.ink2} />
          <Text style={styles.label}>About the app</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSolid },
  head: { paddingHorizontal: space.m, paddingTop: space.m, paddingBottom: space.m, gap: space.m, borderBottomWidth: 1, borderBottomColor: colors.line },
  wordmark: { width: 120, aspectRatio: 1024 / 411 },
  console: { gap: 3 },
  consoleName: { fontFamily: fonts.light, fontSize: 20, color: colors.ink },
  consoleInfo: { ...type.body, fontSize: 13, lineHeight: 18 },
  items: { padding: space.s, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 2, borderColor: 'transparent' },
  active: { backgroundColor: colors.selected, borderColor: colors.frame },
  pressed: { backgroundColor: colors.surface2 },
  label: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink2 },
  activeLabel: { color: colors.ink },
  foot: { padding: space.s, gap: 2, borderTopWidth: 1, borderTopColor: colors.line },
});

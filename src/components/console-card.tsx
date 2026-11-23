import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConsoleSystem, Endpoint } from '@/batox/api';
import { colors, fonts, space } from '@/theme/tokens';

import { ConsoleLogo } from './console-logo';

export const TYPE_LABEL: Record<string, string> = { console: 'Console', portable: 'Handheld', arcade: 'Arcade', computer: 'Computer' };

const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

// A system as on the web panel's Consoles screen: its logo, its name, who made it and when, its
// games, favorites and type. A system without games is dimmed.
export function ConsoleCard({ endpoint, system, onPress }: { endpoint: Endpoint; system: ConsoleSystem; onPress: () => void }) {
  const sub = [system.manufacturer, system.releaseYear].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${system.fullName}: ${plural(system.games, 'game', 'games')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, !system.games && styles.empty, pressed && styles.pressed]}>
      <ConsoleLogo endpoint={endpoint} system={system} height={36} style={styles.logo} />
      <Text style={styles.name} numberOfLines={2}>
        {system.fullName}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {sub || ' '}
      </Text>
      <View style={styles.foot}>
        <Text style={styles.games}>{plural(system.games, 'game', 'games')}</Text>
        {system.favorites ? <Text style={styles.fav}>★ {system.favorites}</Text> : null}
        <Text style={styles.type}>
          {TYPE_LABEL[system.hardware ?? ''] || system.hardware || 'System'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.surface, padding: space.s, gap: 3, borderWidth: 2, borderColor: 'transparent' },
  empty: { opacity: 0.6 },
  pressed: { backgroundColor: colors.selected, borderColor: colors.frame, opacity: 1 },
  logo: { marginBottom: 6 },
  name: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 19, color: colors.ink, minHeight: 38 },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  foot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2, marginTop: 6 },
  games: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink },
  fav: { fontFamily: fonts.regular, fontSize: 12, color: colors.signal },
  type: { marginLeft: 'auto', fontFamily: fonts.regular, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink2 },
});

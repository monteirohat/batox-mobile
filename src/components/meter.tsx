import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space, type } from '@/theme/tokens';

export type Level = 'ok' | 'warn' | 'hot';

const BAR: Record<Level, string> = { ok: colors.ok, warn: colors.signal, hot: colors.danger };

// One figure of the console, as on the web panel's dashboard: a label, the value large and Light,
// a line about it, and a thin bar filled in green, yellow or red
export function Meter({ label, value, note, fraction, level = 'ok' }: { label: string; value: string; note?: string; fraction?: number; level?: Level }) {
  return (
    <View style={styles.meter}>
      <Text style={type.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {fraction !== undefined ? (
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${Math.max(0, Math.min(1, fraction)) * 100}%`, backgroundColor: BAR[level] }]} />
        </View>
      ) : null}
    </View>
  );
}

// Meters two by two, 5 px apart like the theme's tiles
export function Meters({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  meter: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.surface, paddingHorizontal: space.m, paddingTop: space.m, paddingBottom: space.m, gap: space.xs },
  value: { fontFamily: fonts.light, fontSize: 28, color: colors.ink, fontVariant: ['tabular-nums'] },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.ink2 },
  track: { height: 4, backgroundColor: colors.line, marginTop: space.s, overflow: 'hidden' },
  bar: { height: 4 },
});

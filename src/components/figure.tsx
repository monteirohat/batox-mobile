import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space, type } from '@/theme/tokens';

// A label in capitals over a figure, as on the theme's and the web panel's plates. A missing value
// shows "-", never an empty space. Figures are Light and large; words (a publisher, a genre) are
// Regular and smaller, like the web panel's values.
export function Figure({ label, value, note, words }: { label: string; value?: string; note?: string; words?: boolean }) {
  return (
    <View style={styles.figure}>
      <Text style={type.label}>{label}</Text>
      <Text style={[styles.value, words && styles.words]}>{value || '-'}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

// Figures two by two
export function Figures({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.m },
  figure: { width: '50%', gap: space.xs, paddingRight: space.s },
  value: { fontFamily: fonts.light, fontSize: 24, color: colors.ink },
  words: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
});

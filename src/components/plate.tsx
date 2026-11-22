import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, space, type } from '@/theme/tokens';

// A surface at rest, with an optional label in capitals at its top. tone="error" marks a failure
// with a red edge.
export function Plate({ label, children, tone, style }: { label?: string; children: ReactNode; tone?: 'error'; style?: ViewStyle }) {
  return (
    <View style={[styles.plate, tone === 'error' && styles.error, style]}>
      {label ? <Text style={type.label}>{label}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: colors.surface, padding: space.m, gap: space.s },
  error: { borderLeftWidth: 3, borderLeftColor: colors.danger },
});

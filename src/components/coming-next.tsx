import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '@/theme/tokens';

// A plate for a screen still being built: what it will do, on a surface at rest
export function ComingNext({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.plate}>
      <Text style={type.label}>Coming next</Text>
      <Text style={[type.title, styles.title]}>{title}</Text>
      <Text style={type.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: colors.surface, padding: space.l, gap: space.xs },
  title: { marginBottom: space.xs },
});

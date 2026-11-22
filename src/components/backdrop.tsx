import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

// The sunset picture behind a whole screen, dark at the top and at the bottom so text and
// buttons stay readable over it. Its content sits inside the safe area, at the side margin.
export function Backdrop({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <Image source={require('@/assets/images/backdrop.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <SafeAreaView style={styles.content}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: space.side },
});

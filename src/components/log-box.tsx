import { useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, type ScrollViewInstance } from 'react-native';

import { colors, space } from '@/theme/tokens';

// A log file's last lines in a box that scrolls on its own inside the screen, and opens at the
// end, where the newest lines are
export function LogBox({ lines, empty }: { lines: string[]; empty: string }) {
  const ref = useRef<ScrollViewInstance>(null);
  return (
    <ScrollView ref={ref} style={styles.box} contentContainerStyle={styles.content} nestedScrollEnabled onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}>
      <Text style={styles.log} selectable>
        {lines.length ? lines.join('\n') : empty}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: 'rgba(0, 0, 0, 0.35)', maxHeight: 480 },
  content: { padding: space.s },
  log: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 11, lineHeight: 15, color: colors.ink2 },
});

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { bytes } from '@/batox/format';
import type { QueueItem } from '@/batox/use-upload-queue';
import { colors, fonts, space } from '@/theme/tokens';

const MARK: Record<Exclude<QueueItem['state'], 'uploading'>, string> = { waiting: '·', done: '✓', skipped: '–', error: '✕' };

// The files of an upload, one per row: waiting, sending (with its percentage), sent, skipped or failed
export function UploadList({ items }: { items: QueueItem[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.key} style={styles.row}>
          <View style={styles.mark}>
            {item.state === 'uploading' ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={[styles.markText, item.state === 'done' && styles.ok, item.state === 'error' && styles.bad]}>{MARK[item.state]}</Text>
            )}
          </View>
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.detail, item.state === 'error' && styles.bad]}>
              {item.state === 'uploading'
                ? `Sending ${item.percent ?? 0}%`
                : item.state === 'waiting'
                  ? 'Waiting'
                  : (item.message ?? '')}
              {item.size ? `  ·  ${bytes(item.size)}` : ''}
            </Text>
            {item.state === 'uploading' ? (
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${item.percent ?? 0}%` }]} />
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.s },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  mark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink3 },
  ok: { color: colors.ok },
  bad: { color: colors.danger },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  track: { height: 3, backgroundColor: colors.line, marginTop: 2 },
  bar: { height: 3, backgroundColor: colors.frame },
});

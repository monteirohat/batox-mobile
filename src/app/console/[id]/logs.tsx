import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { getEsLog, getLogs } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { Backdrop } from '@/components/backdrop';
import { Chips } from '@/components/chips';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

type Kind = 'info' | 'error' | 'es';
type Row = { key: string; level: string; time?: string; msg: string };

const KINDS: { value: Kind; label: string }[] = [
  { value: 'info', label: 'Activity' },
  { value: 'error', label: 'Errors' },
  { value: 'es', label: 'EmulationStation' },
];
const TAILS = [100, 200, 1000].map((n) => ({ value: n, label: `${n} lines` }));

const EMPTY: Record<Kind, { title: string; text: string }> = {
  info: { title: 'Nothing logged yet', text: 'Changes made through BatoX show up here.' },
  error: { title: 'No errors logged', text: 'When something fails, the reason shows up here.' },
  es: { title: "EmulationStation's log is empty", text: 'It fills as EmulationStation starts, loads games and runs them.' },
};

// BatoX's lines are JSON ({"level","msg","time"}); EmulationStation's are plain text
function toRows(lines: string[], kind: Kind): Row[] {
  return lines
    .map((line, i) => {
      if (kind === 'es') return { key: String(i), level: /\b(error|fatal)\b/i.test(line) ? 'error' : 'info', msg: line };
      try {
        const e = JSON.parse(line) as { level?: string; msg?: string; time?: string };
        return { key: String(i), level: e.level ?? 'info', time: e.time, msg: e.msg ?? line };
      } catch {
        return { key: String(i), level: 'info', msg: line };
      }
    })
    .reverse();
}

function when(time?: string): string {
  if (!time) return '';
  const d = new Date(time);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// What BatoX did recently, its errors, and EmulationStation's own log; newest first
export default function Logs() {
  const { saved } = useConsole();
  const [kind, setKind] = useState<Kind>('info');
  const [tail, setTail] = useState(200);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [file, setFile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!saved) return;
    try {
      const result = kind === 'es' ? await getEsLog(saved, tail) : await getLogs(saved, kind, tail);
      setRows(toRows(result.lines, kind));
      setFile(result.file);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [saved, kind, tail]);

  // Read again on coming back, and when the log or the number of lines changes
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const choose = (next: Kind) => {
    setRows(null);
    setKind(next);
  };

  return (
    <Backdrop>
      <FlatList
        style={page.scroller}
        data={rows ?? []}
        keyExtractor={(r) => r.key}
        contentContainerStyle={[styles.list, page.content]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}
        initialNumToRender={30}
        ListHeaderComponent={
          <View style={styles.header}>
            <Chips options={KINDS} value={kind} onChange={choose} />
            <Chips options={TAILS} value={tail} onChange={setTail} />
            {error ? (
              <Plate label="Couldn't read the log" tone="error">
                <Text style={[type.body, styles.strong]}>{error}</Text>
              </Plate>
            ) : null}
            {!rows && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}
            {rows && rows.length > 0 ? <Text style={type.label}>Newest first  ·  pull down to refresh</Text> : null}
          </View>
        }
        ListEmptyComponent={
          rows ? (
            <Plate>
              <Text style={styles.emptyTitle}>{EMPTY[kind].title}</Text>
              <Text style={type.body}>{EMPTY[kind].text}</Text>
            </Plate>
          ) : undefined
        }
        ListFooterComponent={file && rows?.length ? <Text style={styles.file}>File: {file}</Text> : undefined}
        renderItem={({ item }) => (
          <View style={[styles.row, item.level === 'error' && styles.rowError, item.level === 'warn' && styles.rowWarn]}>
            {item.time ? <Text style={styles.time}>{when(item.time)}</Text> : null}
            <Text style={[styles.msg, kind === 'es' && styles.mono]} selectable>
              {item.msg}
            </Text>
          </View>
        )}
      />
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 72, paddingBottom: space.xl, gap: 3 },
  header: { gap: space.s, marginBottom: space.s },
  loading: { marginTop: space.l },
  strong: { color: colors.ink },
  emptyTitle: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  row: { backgroundColor: colors.surface, paddingHorizontal: space.s, paddingVertical: 8, gap: 2, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  rowError: { borderLeftColor: colors.danger, backgroundColor: 'rgba(252, 108, 105, 0.12)' },
  rowWarn: { borderLeftColor: colors.signal },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink3 },
  msg: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.ink },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12, lineHeight: 17 },
  file: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink3, marginTop: space.s },
});

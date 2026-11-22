import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Progress, StepId, StepState } from '@/batox/install';
import { colors, fonts, space } from '@/theme/tokens';

export type StepView = { id: StepId; label: string; state: StepState; detail?: string; percent?: number };

const MARK: Record<Exclude<StepState, 'active'>, string> = { pending: '·', done: '✓', skipped: '–', error: '✕' };

// The install's steps, one per row: what is done, what runs now, what failed
export function Steps({ steps }: { steps: StepView[] }) {
  return (
    <View style={styles.list}>
      {steps.map((s) => (
        <View key={s.id} style={styles.row}>
          <View style={styles.mark}>
            {s.state === 'active' ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={[styles.markText, s.state === 'done' && styles.ok, s.state === 'error' && styles.bad]}>{MARK[s.state]}</Text>
            )}
          </View>
          <View style={styles.text}>
            <Text style={[styles.label, (s.state === 'pending' || s.state === 'skipped') && styles.dim]}>
              {s.label}
              {s.state === 'active' && s.percent !== undefined ? `  ${s.percent}%` : ''}
            </Text>
            {s.detail && s.state !== 'error' ? <Text style={styles.detail}>{s.detail}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

// Folds a progress report into the list
export function applyProgress(steps: StepView[], p: Progress): StepView[] {
  return steps.map((s) => (s.id === p.step ? { ...s, state: p.state, detail: p.detail ?? s.detail, percent: p.percent } : s));
}

const styles = StyleSheet.create({
  list: { gap: space.s },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  mark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink3 },
  ok: { color: colors.ok },
  bad: { color: colors.danger },
  text: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  dim: { color: colors.ink3 },
  detail: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
});

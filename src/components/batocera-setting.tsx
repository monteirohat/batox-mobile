import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BatoceraSetting } from '@/batox/api';
import { choiceText, controlOf, shortKey } from '@/batox/batocera';
import { colors, fonts, space } from '@/theme/tokens';

import { Button } from './button';
import { ChoiceSheet } from './choice-sheet';
import { Chips } from './chips';

// More choices than this open a list of their own instead of sitting in the row
const INLINE_CHOICES = 6;
const SCREENS: Record<string, string> = { audio: 'Audio', video: 'Video' };

type Props = {
  category: string;
  setting: BatoceraSetting;
  // Saves the key; false when it failed (the row goes back to the saved value)
  onSave: (key: string, value: string) => Promise<boolean>;
  onOpenScreen: (screen: 'audio' | 'video') => void;
};

// A batocera.conf key with the control that suits it, as on the web panel: On and Off, a list and
// a range save as soon as they change; text and numbers have a Save button. A key that isn't set
// shows Batocera's default and an Enable button.
export function BatoceraSettingRow({ category, setting, onSave, onOpenScreen }: Props) {
  const c = controlOf(setting);
  const title = c.label || shortKey(category, setting.key);
  const example = !setting.active && setting.value !== '' && !setting.sensitive && c.type !== 'screen' ? `  ·  example: ${setting.value}` : '';

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.key}>
          {setting.key}
          {setting.active ? '' : `  ·  not set, Batocera uses its default${example}`}
        </Text>
        {setting.description ? <Text style={styles.description}>{setting.description}</Text> : null}
      </View>
      <Control setting={setting} title={title} onSave={onSave} onOpenScreen={onOpenScreen} />
    </View>
  );
}

function Control({ setting, title, onSave, onOpenScreen }: { setting: BatoceraSetting; title: string } & Pick<Props, 'onSave' | 'onOpenScreen'>) {
  const c = controlOf(setting);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState(setting.active ? setting.value : '');
  const [reveal, setReveal] = useState(false);

  const save = async (value: string) => {
    setBusy(true);
    setSaved(false);
    const ok = await onSave(setting.key, value);
    setBusy(false);
    setSaved(ok);
  };
  const done = saved ? <Text style={styles.ok}>Saved.</Text> : null;

  switch (c.type) {
    case 'toggle':
      return (
        <>
          <Chips
            options={[
              { value: '1', label: 'On' },
              { value: '0', label: 'Off' },
            ]}
            value={setting.active ? setting.value : null}
            disabled={busy}
            onChange={(v) => !(setting.active && setting.value === v) && void save(v)}
          />
          {done}
        </>
      );
    case 'select': {
      const choices = [...(c.choices ?? [])];
      if (setting.active && !choices.some((x) => x.value === setting.value)) choices.push({ value: setting.value, label: 'current value' });
      const options = choices.map((x) => ({ value: x.value, label: choiceText(x, Boolean(c.label)) }));
      const pick = (v: string) => !(setting.active && setting.value === v) && void save(v);
      if (options.length <= INLINE_CHOICES) {
        return (
          <>
            <Chips options={options} value={setting.active ? setting.value : null} disabled={busy} onChange={pick} />
            {done}
          </>
        );
      }
      const current = options.find((o) => o.value === setting.value);
      return (
        <>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setSheet(true)} style={({ pressed }) => [styles.picker, pressed && styles.pickerPressed]}>
            <Text style={styles.pickerValue} numberOfLines={2}>
              {setting.active ? (current?.label ?? setting.value) : 'Not set'}
            </Text>
            <Text style={styles.pickerHint}>{options.length} choices  ·  Change</Text>
          </Pressable>
          {done}
          <ChoiceSheet
            title={title}
            choices={options}
            value={setting.active ? setting.value : null}
            visible={sheet}
            onClose={() => setSheet(false)}
            onPick={(v) => {
              setSheet(false);
              pick(v);
            }}
          />
        </>
      );
    }
    case 'range': {
      const min = c.min ?? 0;
      const max = c.max ?? 100;
      const step = c.step || 1;
      const n = Number(draft === '' ? setting.value || min : draft);
      const set = (next: number) => setDraft(String(Math.min(max, Math.max(min, Number(next.toFixed(4))))));
      const changed = draft !== '' && (!setting.active || draft !== setting.value);
      return (
        <>
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel="Less" onPress={() => set(n - step)} disabled={n <= min} style={[styles.stepButton, n <= min && styles.stepOff]}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>{draft === '' ? 'Not set' : `${draft}${c.unit ?? ''}`}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => set(n + step)} disabled={n >= max} style={[styles.stepButton, n >= max && styles.stepOff]}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          {changed ? <Button primary label={busy ? 'Saving…' : 'Save'} onPress={() => void save(draft)} disabled={busy} /> : done}
        </>
      );
    }
    case 'screen':
      return (
        <View style={styles.screen}>
          <Text style={styles.screenValue} numberOfLines={1}>
            {setting.active ? setting.value || 'empty' : 'Not set'}
          </Text>
          {c.screen ? <Button label={`Open the ${SCREENS[c.screen] ?? c.screen} screen`} onPress={() => onOpenScreen(c.screen!)} /> : null}
        </View>
      );
  }

  // Typed values: text, a password, a whole number, or text with suggestions
  const secret = c.type === 'password';
  const number = c.type === 'number';
  const changed = setting.active ? draft !== setting.value : true;
  const submit = () => {
    const value = !setting.active && draft === '' ? setting.value : draft;
    if (number && value !== '' && !/^-?\d+$/.test(value)) {
      Alert.alert(title, 'Enter a whole number.');
      return;
    }
    void save(value);
  };
  const suggestions = c.type === 'combo' ? (c.choices ?? []) : [];
  return (
    <>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={(v) => {
            setDraft(v);
            setSaved(false);
          }}
          placeholder={setting.active || secret ? '' : setting.value}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.link}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secret && !reveal}
          keyboardType={number ? 'numbers-and-punctuation' : 'default'}
          accessibilityLabel={setting.key}
          style={[styles.input, styles.inputFlex]}
          onSubmitEditing={() => changed && submit()}
        />
        {secret ? (
          <Pressable accessibilityRole="button" onPress={() => setReveal((r) => !r)} style={styles.reveal}>
            <Text style={styles.revealText}>{reveal ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      {suggestions.length && suggestions.length <= INLINE_CHOICES ? (
        <Chips
          options={suggestions.map((x) => ({ value: x.value, label: x.label ? `${x.value} — ${x.label}` : x.value }))}
          value={draft}
          onChange={(v) => {
            setDraft(v);
            setSaved(false);
          }}
        />
      ) : null}
      {suggestions.length > INLINE_CHOICES ? (
        <>
          <Button label={`Choose from ${suggestions.length} suggestions`} onPress={() => setSheet(true)} />
          <ChoiceSheet
            title={title}
            choices={suggestions.map((x) => ({ value: x.value, label: x.label ? `${x.value} — ${x.label}` : x.value }))}
            value={draft}
            visible={sheet}
            onClose={() => setSheet(false)}
            onPick={(v) => {
              setSheet(false);
              setDraft(v);
              setSaved(false);
            }}
          />
        </>
      ) : null}
      <Button primary={!setting.active} label={busy ? 'Saving…' : setting.active ? 'Save' : 'Enable'} onPress={submit} disabled={busy || !changed} />
      {done}
    </>
  );
}

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, padding: space.m, gap: space.s },
  head: { gap: 3 },
  title: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  key: { fontFamily: mono, fontSize: 12, lineHeight: 17, color: colors.ink3 },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  ok: { fontFamily: fonts.regular, fontSize: 13, color: colors.ok },
  picker: { backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 12, gap: 3, borderWidth: 2, borderColor: 'transparent' },
  pickerPressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  pickerValue: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  pickerHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  stepButton: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  stepOff: { opacity: 0.4 },
  stepText: { fontFamily: fonts.regular, fontSize: 22, color: colors.ink },
  stepValue: { minWidth: 90, textAlign: 'center', fontFamily: fonts.light, fontSize: 22, color: colors.ink, fontVariant: ['tabular-nums'] },
  screen: { gap: space.s },
  screenValue: { fontFamily: mono, fontSize: 13, color: colors.ink2 },
  inputRow: { flexDirection: 'row', gap: space.xs },
  input: { minHeight: 48, paddingHorizontal: 14, backgroundColor: colors.surface2, color: colors.ink, fontFamily: fonts.regular, fontSize: 16 },
  inputFlex: { flex: 1 },
  reveal: { minWidth: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline },
  revealText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
});

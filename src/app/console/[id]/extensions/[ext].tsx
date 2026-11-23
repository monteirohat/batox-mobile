import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getExtensionLog, getExtensions, saveExtensionSettings, type Extension, type ExtensionSetting } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { statusLine } from '@/batox/extensions';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Field } from '@/components/field';
import { LogBox } from '@/components/log-box';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

// One installed extension: its settings, each with the control its manifest asks for, and its log
export default function ExtensionDetail() {
  const { saved } = useConsole();
  const { ext } = useLocalSearchParams<{ ext: string }>();
  const [x, setX] = useState<Extension | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [log, setLog] = useState<string[] | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const loadLog = useCallback(() => {
    if (!saved) return;
    getExtensionLog(saved, ext, 300)
      .then((r) => {
        setLog(r.lines);
        setLogError(null);
      })
      .catch((e: Error) => setLogError(e.message));
  }, [saved, ext]);

  useEffect(() => {
    if (!saved) return;
    getExtensions(saved)
      .then((data) => {
        const found = data.items.find((i) => i.id === ext) ?? null;
        setX(found);
        setValues({ ...(found?.values ?? {}) });
        if (!found) setError("This extension isn't on the console anymore.");
      })
      .catch((e: Error) => setError(e.message));
    loadLog();
  }, [saved, ext, loadLog]);

  const changed = x ? Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== (x.values ?? {})[k])) : {};
  const dirty = Object.keys(changed).length > 0;

  const save = async () => {
    if (!saved || !x || !dirty) return;
    setSaving(true);
    setSavedNote(null);
    setError(null);
    try {
      await saveExtensionSettings(saved, x.id, changed);
      setX({ ...x, values: { ...(x.values ?? {}), ...changed } });
      setSavedNote(x.enabled ? `Saved. ${x.name} restarted with the new settings.` : 'Saved.');
      setTimeout(loadLog, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const status = x ? statusLine(x) : null;

  return (
    <Backdrop>
      <Stack.Screen options={{ title: x?.name ?? 'Extension' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} keyboardShouldPersistTaps="handled">
          {!x && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

          {x && status ? (
            <Plate>
              <Text style={styles.name}>{x.name}</Text>
              <Text style={styles.small}>
                Version {x.installed}  ·  {status.text}
              </Text>
            </Plate>
          ) : null}

          {x?.settings?.length ? (
            <Plate label="Settings">
              {x.settings.map((s) => (
                <SettingField key={s.key} setting={s} value={values[s.key] ?? s.default ?? ''} onChange={(v) => setValues((cur) => ({ ...cur, [s.key]: v }))} />
              ))}
              <Text style={styles.small}>Saving restarts {x.name} with the new settings.</Text>
              <Button primary label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!dirty || saving} />
              {savedNote ? <Text style={styles.ok}>{savedNote}</Text> : null}
            </Plate>
          ) : null}

          {error ? (
            <Plate label="Didn't work" tone="error">
              <Text style={[type.body, styles.strong]}>{error}</Text>
            </Plate>
          ) : null}

          {x ? (
            <Plate label="Log  ·  last 300 lines">
              {logError ? <Text style={[type.body, styles.strong]}>{logError}</Text> : null}
              {!log && !logError ? <ActivityIndicator color={colors.ink} /> : null}
              {log ? <LogBox lines={log} empty="Nothing written yet." /> : null}
              <Button label="Reload" onPress={loadLog} />
            </Plate>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

// A setting with the control its manifest names: text, number, on/off, a choice, or a range
function SettingField({ setting, value, onChange }: { setting: ExtensionSetting; value: string; onChange: (value: string) => void }) {
  const control = setting.control ?? { type: 'text' as const };
  const head = (
    <View style={styles.settingHead}>
      <Text style={styles.settingLabel}>{setting.label}</Text>
      {setting.description ? <Text style={styles.small}>{setting.description}</Text> : null}
    </View>
  );
  switch (control.type) {
    case 'toggle':
      return (
        <View style={styles.setting}>
          {head}
          <Chips
            options={[
              { value: '1', label: 'On' },
              { value: '0', label: 'Off' },
            ]}
            value={value}
            onChange={onChange}
          />
        </View>
      );
    case 'select':
      return (
        <View style={styles.setting}>
          {head}
          <Chips options={(control.choices ?? []).map((c) => ({ value: c.value, label: c.label ?? c.value }))} value={value} onChange={onChange} />
        </View>
      );
    case 'range': {
      const step = control.step ?? 1;
      const n = Number(value);
      const set = (next: number) => onChange(String(Math.min(control.max, Math.max(control.min, next))));
      return (
        <View style={styles.setting}>
          {head}
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel="Less" onPress={() => set(n - step)} disabled={n <= control.min} style={[styles.stepButton, n <= control.min && styles.stepOff]}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>
              {value}
              {control.unit ?? ''}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => set(n + step)} disabled={n >= control.max} style={[styles.stepButton, n >= control.max && styles.stepOff]}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    case 'number':
      return (
        <View style={styles.setting}>
          {head}
          <Field label={control.unit ? `In ${control.unit}` : undefined} value={value} onChangeText={(v) => onChange(v.replace(/[^0-9-]/g, ''))} keyboardType="number-pad" />
        </View>
      );
    default:
      return (
        <View style={styles.setting}>
          {head}
          <Field value={value} onChangeText={onChange} maxLength={200} accessibilityLabel={setting.label} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  name: { fontFamily: fonts.light, fontSize: 24, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  ok: { fontFamily: fonts.regular, fontSize: 14, color: colors.ok },
  setting: { gap: space.xs, paddingBottom: space.s, borderBottomWidth: 1, borderBottomColor: colors.line },
  settingHead: { gap: 2 },
  settingLabel: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  stepButton: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  stepOff: { opacity: 0.4 },
  stepText: { fontFamily: fonts.regular, fontSize: 22, color: colors.ink },
  stepValue: { minWidth: 70, textAlign: 'center', fontFamily: fonts.light, fontSize: 24, color: colors.ink, fontVariant: ['tabular-nums'] },
});

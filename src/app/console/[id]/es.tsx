import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { clearEsLog, esAction, getEsLog, getEsSettings, setEsSetting, type EsAction, type EsSetting } from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { uploadFile } from '@/batox/upload';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Field } from '@/components/field';
import { LogBox } from '@/components/log-box';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

type Tab = 'controls' | 'settings' | 'theme' | 'log';

const TABS: { value: Tab; label: string }[] = [
  { value: 'controls', label: 'Controls' },
  { value: 'settings', label: 'Settings' },
  { value: 'theme', label: 'Theme' },
  { value: 'log', label: 'Log' },
];

const CONTROLS: { action: EsAction; title: string; text: string; primary?: boolean }[] = [
  { action: 'reload-gamelists', title: 'Reload game lists', text: 'Makes EmulationStation read the ROM folders again. Use it after copying games without BatoX.', primary: true },
  { action: 'restart', title: 'Restart', text: 'Closes and reopens it. Needed to apply new themes.' },
  { action: 'stop', title: 'Stop', text: 'Closes the interface and leaves the screen empty. Useful while changing settings.' },
  { action: 'start', title: 'Start', text: 'Opens the interface again after it was stopped.' },
];

const DONE: Record<EsAction, string> = {
  'reload-gamelists': 'Game lists reloaded.',
  restart: 'EmulationStation restarted.',
  stop: 'EmulationStation stopped.',
  start: 'EmulationStation started.',
};

// Batocera's game browser: start, stop and reload it, edit es_settings.cfg, install a theme, read its log
export default function EmulationStation() {
  const [tab, setTab] = useState<Tab>('controls');
  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} keyboardShouldPersistTaps="handled">
          <Chips options={TABS} value={tab} onChange={setTab} />
          {tab === 'controls' ? <Controls /> : tab === 'settings' ? <Settings /> : tab === 'theme' ? <Theme /> : <Log />}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

function Controls() {
  const { saved } = useConsole();
  const [busy, setBusy] = useState<EsAction | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (action: EsAction) => {
    if (!saved) return;
    setBusy(action);
    setDone(null);
    try {
      await esAction(saved, action);
      setDone(DONE[action]);
    } catch (e) {
      Alert.alert("Didn't work", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const press = (action: EsAction) => {
    if (action !== 'stop') return void run(action);
    Alert.alert('Stop EmulationStation?', 'The console screen stays empty until you use Start.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => void run('stop') },
    ]);
  };

  return (
    <>
      {done ? <Text style={styles.ok}>{done}</Text> : null}
      {CONTROLS.map((c) => (
        <Plate key={c.action}>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={type.body}>{c.text}</Text>
          <Button primary={c.primary} label={busy === c.action ? 'Working…' : c.title} onPress={() => press(c.action)} disabled={busy !== null} />
        </Plate>
      ))}
    </>
  );
}

function Settings() {
  const { saved } = useConsole();
  const [list, setList] = useState<EsSetting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [restart, setRestart] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'' | EsSetting['type']>('');
  const [newValue, setNewValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!saved) return;
      getEsSettings(saved)
        .then(setList)
        .catch((e: Error) => setError(e.message));
    }, [saved]),
  );

  const shown = useMemo(() => (list ?? []).filter((s) => !query.trim() || s.name.toLowerCase().includes(query.trim().toLowerCase())), [list, query]);

  const save = async (name: string, value: string, kind?: EsSetting['type']) => {
    if (!saved) return;
    setBusy(name);
    setNote(null);
    try {
      const res = await setEsSetting(saved, name, value, kind, restart);
      setList((cur) => {
        const all = cur ?? [];
        return all.some((s) => s.name === name) ? all.map((s) => (s.name === name ? res.setting : s)) : [...all, res.setting];
      });
      setNote(`${name} saved${res.restarted ? ' and EmulationStation restarted' : ''}.`);
      return true;
    } catch (e) {
      Alert.alert(`Couldn't save ${name}`, e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Plate label="es_settings.cfg">
        <Text style={type.body}>EmulationStation rewrites this file when it closes, so it is stopped before saving and started again afterwards.</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search settings" placeholderTextColor={colors.ink3} autoCapitalize="none" autoCorrect={false} style={styles.search} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Restart EmulationStation when saving</Text>
          <Switch value={restart} onValueChange={setRestart} trackColor={{ true: colors.selected, false: colors.outline }} thumbColor={restart ? colors.frame : colors.ink2} />
        </View>
        {note ? <Text style={styles.ok}>{note}</Text> : null}
      </Plate>
      {error ? (
        <Plate label="Couldn't read the settings" tone="error">
          <Text style={[type.body, styles.strong]}>{error}</Text>
        </Plate>
      ) : null}
      {!list && !error ? <ActivityIndicator color={colors.ink} /> : null}
      {list && shown.length === 0 ? (
        <Plate>
          <Text style={type.body}>No settings found. Check the search, or add a new setting below.</Text>
        </Plate>
      ) : null}
      {shown.map((s) => (
        <SettingRow key={`${s.name}=${s.value}`} setting={s} busy={busy === s.name} onSave={(v) => save(s.name, v)} />
      ))}
      <Plate label="New setting">
        <Text style={type.body}>Adds a key that is not in the file yet.</Text>
        <Field label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. ScreenSaverTime" />
        <Text style={type.label}>Type</Text>
        <Chips
          options={[
            { value: '', label: 'Automatic' },
            { value: 'string', label: 'string' },
            { value: 'bool', label: 'bool' },
            { value: 'int', label: 'int' },
            { value: 'float', label: 'float' },
          ]}
          value={newType}
          onChange={setNewType}
        />
        <Field label="Value" value={newValue} onChangeText={setNewValue} />
        <Button
          label="Add setting"
          onPress={async () => {
            if (await save(newName.trim(), newValue, newType || undefined)) {
              setNewName('');
              setNewValue('');
            }
          }}
          disabled={!newName.trim() || busy !== null}
        />
      </Plate>
    </>
  );
}

// One entry of es_settings.cfg: true or false for a bool, text for the rest; Save once changed
function SettingRow({ setting, busy, onSave }: { setting: EsSetting; busy: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(setting.value);
  const changed = value !== setting.value;
  return (
    <View style={styles.setting}>
      <View style={styles.settingHead}>
        <Text style={styles.settingName}>{setting.name}</Text>
        <Text style={styles.settingType}>{setting.type}</Text>
      </View>
      {setting.type === 'bool' ? (
        <Chips
          options={[
            { value: 'true', label: 'true' },
            { value: 'false', label: 'false' },
          ]}
          value={value}
          onChange={setValue}
        />
      ) : (
        <TextInput
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={setting.type === 'int' || setting.type === 'float' ? 'numbers-and-punctuation' : 'default'}
          style={styles.search}
          accessibilityLabel={setting.name}
        />
      )}
      {changed ? <Button primary label={busy ? 'Saving…' : 'Save'} onPress={() => onSave(value)} disabled={busy} /> : null}
    </View>
  );
}

type After = 'activate' | 'restart' | 'none';

function Theme() {
  const { saved } = useConsole();
  const [after, setAfter] = useState<After>('activate');
  const [percent, setPercent] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const install = async () => {
    if (!saved) return;
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'], copyToCacheDirectory: Platform.OS === 'ios' });
    if (picked.canceled) return;
    const file = picked.assets[0];
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Choose the theme as a .zip file.');
      return;
    }
    setError(null);
    setResult(null);
    setPercent(0);
    try {
      const r = await uploadFile<{ theme: string; dir: string; activated?: boolean; restarted?: boolean; warning?: string }>(
        saved,
        `/emulationstation/theme${after === 'none' ? '' : `?${after}=true`}`,
        { uri: file.uri, name: file.name, size: file.size, mimeType: file.mimeType },
        (sent, total) => setPercent(Math.round((sent / total) * 100)),
      );
      setResult(
        `Theme ${r.theme} installed in ${r.dir}${r.activated ? '. It is now active.' : r.restarted ? '. EmulationStation was restarted.' : '. Restart EmulationStation to see it.'}${r.warning ? `\n${r.warning}` : ''}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPercent(null);
    }
  };

  return (
    <>
      <Plate label="Install a theme">
        <Text style={type.body}>Choose the theme as a .zip file. The file name becomes the theme name, and a theme with the same name is replaced.</Text>
        <Text style={type.label}>Then</Text>
        <Chips
          options={[
            { value: 'activate', label: 'Activate it', hint: 'Set it as the theme and restart EmulationStation.' },
            { value: 'restart', label: 'Only restart', hint: 'Restart EmulationStation, keeping the current theme.' },
            { value: 'none', label: 'Do nothing', hint: 'Install it and leave EmulationStation as it is.' },
          ]}
          value={after}
          onChange={setAfter}
        />
        {percent !== null ? (
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${percent}%` }]} />
          </View>
        ) : null}
        <Button primary label={percent !== null ? `Installing ${percent}%` : 'Choose the theme and install'} onPress={install} disabled={percent !== null} />
      </Plate>
      {result ? (
        <Plate label="Installed">
          <Text style={[type.body, styles.strong]}>{result}</Text>
        </Plate>
      ) : null}
      {error ? (
        <Plate label="Not installed" tone="error">
          <Text style={[type.body, styles.strong]}>{error}</Text>
        </Plate>
      ) : null}
    </>
  );
}

function Log() {
  const { saved } = useConsole();
  const [tail, setTail] = useState(200);
  const [lines, setLines] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!saved) return;
    getEsLog(saved, tail)
      .then((r) => {
        setLines(r.lines);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [saved, tail]);
  useFocusEffect(load);

  const clear = () => {
    if (!saved) return;
    Alert.alert('Clear the log?', 'The current content of es_log.txt will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear log',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearEsLog(saved);
          } catch (e) {
            Alert.alert("Couldn't clear the log", e instanceof Error ? e.message : String(e));
          }
          load();
        },
      },
    ]);
  };

  return (
    <Plate label="es_log.txt  ·  newest last">
      <Chips options={[100, 200, 1000].map((n) => ({ value: n, label: `${n} lines` }))} value={tail} onChange={setTail} />
      {error ? <Text style={[type.body, styles.strong]}>{error}</Text> : null}
      {!lines && !error ? <ActivityIndicator color={colors.ink} /> : null}
      {lines ? <LogBox lines={lines} empty="The log is empty." /> : null}
      <View style={styles.row}>
        <View style={styles.half}>
          <Button label="Reload" onPress={load} />
        </View>
        <View style={styles.half}>
          <Button danger label="Clear log" onPress={clear} />
        </View>
      </View>
    </Plate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  strong: { color: colors.ink },
  ok: { fontFamily: fonts.regular, fontSize: 14, color: colors.ok, marginVertical: space.xs },
  title: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  search: { minHeight: 46, paddingHorizontal: 14, backgroundColor: colors.surface2, color: colors.ink, fontFamily: fonts.regular, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  switchLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  setting: { backgroundColor: colors.surface, padding: space.m, gap: space.xs },
  settingHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s },
  settingName: { flexShrink: 1, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 14, color: colors.ink },
  settingType: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink3 },
  track: { height: 4, backgroundColor: colors.line },
  bar: { height: 4, backgroundColor: colors.frame },
  row: { flexDirection: 'row', gap: space.xs },
  half: { flex: 1 },
});

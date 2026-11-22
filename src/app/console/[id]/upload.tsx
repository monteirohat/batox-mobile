import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { getSystems, type RomSystem } from '@/batox/api';
import { hasExtension } from '@/batox/upload';
import { useConsole } from '@/batox/console-context';
import { useUploadQueue } from '@/batox/use-upload-queue';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { SystemPicker } from '@/components/system-picker';
import { UploadList } from '@/components/upload-list';
import { colors, fonts, space, type } from '@/theme/tokens';

// Sends games from the phone to a system's folder on the console; EmulationStation reloads its game
// lists by itself
export default function UploadGames() {
  const { saved } = useConsole();
  const [systems, setSystems] = useState<RomSystem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [system, setSystem] = useState<RomSystem | null>(null);
  const [language, setLanguage] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const { items, add, cancel, clear, busy } = useUploadQueue(saved);

  useEffect(() => {
    if (!saved) return;
    getSystems(saved)
      .then(setSystems)
      .catch((e: Error) => setError(e.message));
  }, [saved]);

  const choose = async () => {
    if (!system) return;
    // On Android the picker's content URI can be read directly; iOS needs its own copy of the file
    const picked = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: Platform.OS === 'ios' });
    if (picked.canceled) return;
    const params = new URLSearchParams({ system: system.name });
    if (language.trim()) params.set('language', language.trim());
    if (overwrite) params.set('overwrite', 'true');
    add(
      picked.assets.map((a) =>
        hasExtension(a.name, system.extensions)
          ? { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType, path: `/roms?${params}` }
          : { uri: a.uri, name: a.name, size: a.size, refused: `Not a ${system.fullName} file (it accepts ${system.extensions.join(' ')})` },
      ),
    );
  };

  const done = items.filter((i) => i.state === 'done').length;

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? (
            <Plate label="Couldn't read the systems" tone="error">
              <Text style={[type.body, styles.strong]}>{error}</Text>
            </Plate>
          ) : null}

          <Plate>
            <Text style={type.title}>Upload games</Text>
            <Text style={type.body}>Files go straight to the system&apos;s folder on the console.</Text>
            <Text style={type.label}>System</Text>
            {systems ? <SystemPicker systems={systems} value={system} onChange={setSystem} /> : !error ? <ActivityIndicator color={colors.ink} /> : null}
            {system ? <Text style={styles.hint}>Accepts {system.extensions.join(' ')}</Text> : null}
            <Field label="Language (optional)" value={language} onChangeText={setLanguage} placeholder="e.g. en, pt or jp" maxLength={10} />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Replace files with the same name</Text>
              <Switch value={overwrite} onValueChange={setOverwrite} trackColor={{ true: colors.selected, false: colors.outline }} thumbColor={overwrite ? colors.frame : colors.ink2} />
            </View>
            <Button primary label="Choose files" onPress={choose} disabled={!system} />
          </Plate>

          {items.length > 0 ? (
            <Plate label={busy ? 'Uploading' : `${done} of ${items.length} sent`}>
              <UploadList items={items} />
              {busy ? <Button danger label="Cancel" onPress={cancel} /> : <Button label="Clear the list" onPress={clear} />}
              {!busy && done > 0 ? <Text style={styles.hint}>EmulationStation reloads its game lists by itself.</Text> : null}
            </Plate>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  strong: { color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  switchLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
});

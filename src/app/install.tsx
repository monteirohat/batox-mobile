import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { inspectConsole, type ConsoleInfo } from '@/batox/console';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { colors, fonts, space, type } from '@/theme/tokens';

// The installer's first step: reach the console over SSH and see what it is. Choosing a version
// and installing come next.
export default function Install() {
  const [host, setHost] = useState('batocera.local');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('linux');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<ConsoleInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      setInfo(await inspectConsole({ host, username, password }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.plate}>
            <Text style={type.title}>Your console</Text>
            <Text style={type.body}>Find its address on the console in Main menu &gt; Network settings.</Text>
            <Field label="Batocera address" value={host} onChangeText={setHost} placeholder="batocera.local or 192.168.0.10" keyboardType="url" editable={!busy} />
            <Field label="SSH user" value={username} onChangeText={setUsername} editable={!busy} />
            <Field label="SSH password" value={password} onChangeText={setPassword} secureTextEntry editable={!busy} />
            <Button primary label={busy ? 'Checking…' : 'Check console'} onPress={check} disabled={busy || !host.trim()} />
            {busy && <ActivityIndicator color={colors.ink} />}
          </View>

          {error && (
            <View style={[styles.plate, styles.errorPlate]}>
              <Text style={type.label}>Couldn&apos;t check the console</Text>
              <Text style={[type.body, styles.errorText]}>{error}</Text>
            </View>
          )}

          {info && (
            <View style={styles.plate}>
              <Text style={type.label}>Console</Text>
              <Text style={styles.name}>{info.model || info.host}</Text>
              <Text style={type.body}>
                Batocera {info.batoceraVersion.split(' ')[0]}, {info.arch === 'arm64' ? 'ARM 64-bit' : 'x86 64-bit'}
              </Text>
              <Text style={[styles.badge, info.installedVersion ? styles.installed : styles.notInstalled]}>
                {info.installedVersion ? `BatoX ${info.installedVersion} installed` : 'BatoX not installed'}
              </Text>
              <Text style={[type.label, styles.keyLabel]}>SSH host key</Text>
              <Text style={styles.key}>{info.hostKey}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  plate: { backgroundColor: colors.surface, padding: space.m, gap: space.s },
  errorPlate: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  errorText: { color: colors.ink },
  name: { fontFamily: fonts.light, fontSize: 24, color: colors.ink },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, fontFamily: fonts.regular, fontSize: 14 },
  installed: { color: colors.ok, backgroundColor: 'rgba(77, 217, 139, 0.16)' },
  notInstalled: { color: colors.ink2, backgroundColor: colors.surface2 },
  keyLabel: { marginTop: space.xs },
  key: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12, color: colors.ink2 },
});

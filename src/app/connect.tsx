import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { displayAddress, parseAddress } from '@/batox/address';
import { checkConnection } from '@/batox/api';
import { consoleId, saveConsole } from '@/batox/consoles';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { colors, space, type } from '@/theme/tokens';

// Connects to a console that already runs BatoX: its address and access token. Opened with
// ?address= to change the token of a console the phone already knows.
export default function Connect() {
  const params = useLocalSearchParams<{ address?: string }>();
  const [address, setAddress] = useState(params.address ?? '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    const parsed = parseAddress(address);
    if (!parsed) {
      setError('Type the console\'s address, for example batocera.local or 192.168.0.10 (add ":port" if BatoX doesn\'t use 8080).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const endpoint = { ...parsed, token: token.trim() };
      const { status, device } = await checkConnection(endpoint);
      await saveConsole({ ...endpoint, name: device?.model || device?.hostname || displayAddress(parsed), version: status.version });
      router.replace({ pathname: '/console/[id]', params: { id: consoleId(parsed) } });
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
          <Plate>
            <Text style={type.title}>Connect to BatoX</Text>
            <Text style={type.body}>For a console that already runs BatoX. The token is kept on this phone, in its secure storage.</Text>
            <Field label="BatoX address" value={address} onChangeText={setAddress} placeholder="batocera.local or 192.168.0.10" keyboardType="url" editable={!busy} />
            <Field label="API token" value={token} onChangeText={setToken} placeholder="32 letters and digits" editable={!busy} />
            <Text style={styles.hint}>
              The BatoX Installer shows the token when it finishes. It is also on the console, in /userdata/system/batox/token.
            </Text>
            <Button primary label={busy ? 'Connecting…' : 'Connect'} onPress={connect} disabled={busy || !address.trim() || !token.trim()} />
            {busy ? <ActivityIndicator color={colors.ink} /> : null}
          </Plate>
          {error ? (
            <Plate label="Couldn't connect" tone="error">
              <Text style={[type.body, styles.strong]}>{error}</Text>
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
  hint: { ...type.body, fontSize: 13, lineHeight: 18 },
  strong: { color: colors.ink },
});

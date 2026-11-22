import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { consoleUrl, displayAddress } from '@/batox/address';
import { ApiError, getDevice, getNowPlaying, getStatus, type Device, type NowPlaying, type Status } from '@/batox/api';
import { forgetConsole, getConsole, saveConsole, type SavedConsole } from '@/batox/consoles';
import { bytes, duration, shortVersion } from '@/batox/format';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Figure, Figures } from '@/components/figure';
import { Plate } from '@/components/plate';
import { colors, fonts, space, type } from '@/theme/tokens';

type Snapshot = { status: Status; device: Device; nowPlaying: NowPlaying | null };

// One console: how it is doing, what is playing, and the way to its BatoX. The features of the web
// panel come here, one by one.
export default function ConsoleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [saved, setSaved] = useState<SavedConsole | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const entry = await getConsole(id);
    setSaved(entry);
    if (!entry) {
      setLoading(false);
      return;
    }
    try {
      const [status, device, nowPlaying] = await Promise.all([getStatus(entry), getDevice(entry), getNowPlaying(entry).catch(() => null)]);
      setSnapshot({ status, device, nowPlaying });
      setError(null);
      // Keep the list's name and version current
      const name = device.model || entry.name;
      if (status.version !== entry.version || name !== entry.name) await saveConsole({ ...entry, name, version: status.version });
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      // While the screen is open, follow what changes (the game, the temperature)
      const timer = setInterval(() => void load(), 15000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const forget = () => {
    if (!saved) return;
    Alert.alert('Forget this console?', `${saved.name} and its token are removed from this phone. BatoX stays on the console.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: async () => {
          await forgetConsole(id);
          router.back();
        },
      },
    ]);
  };

  const address = saved ? displayAddress(saved) : '';
  const device = snapshot?.device;
  const memUsed = device?.memTotalKB && device.memAvailableKB !== undefined ? (device.memTotalKB - device.memAvailableKB) * 1024 : undefined;
  const game = snapshot?.nowPlaying?.playing ? snapshot.nowPlaying.game : undefined;

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}>
        {loading ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

        {!loading && !saved ? (
          <Plate label="Not found">
            <Text style={type.body}>This console isn&apos;t on this phone anymore.</Text>
          </Plate>
        ) : null}

        {saved ? (
          <Plate label="Console">
            <Text style={styles.name}>{device?.model || saved.name}</Text>
            <Text style={type.body}>
              {address}
              {device?.batoceraVersion ? `  ·  Batocera ${shortVersion(device.batoceraVersion)}` : ''}
            </Text>
            <View style={styles.badges}>
              <Text style={[styles.badge, error ? styles.offline : styles.online]}>{error ? 'Not reachable' : snapshot ? 'Online' : '…'}</Text>
              <Text style={[styles.badge, styles.neutral]}>BatoX {snapshot?.status.version ?? saved.version}</Text>
            </View>
          </Plate>
        ) : null}

        {error ? (
          <Plate label={error.status === 401 ? 'Token refused' : "Couldn't reach BatoX"} tone="error">
            <Text style={[type.body, styles.strong]}>{error.message}</Text>
            {error.status === 401 ? (
              <Button label="Change the token" onPress={() => router.push({ pathname: '/connect', params: { address } })} />
            ) : (
              <Button label="Try again" onPress={refresh} />
            )}
          </Plate>
        ) : null}

        {snapshot && device ? (
          <Plate>
            <Figures>
              <Figure label="Temperature" value={device.temperatureC !== undefined ? `${Math.round(device.temperatureC)} °C` : undefined} />
              <Figure label="Running for" value={device.uptimeSeconds !== undefined ? duration(device.uptimeSeconds) : undefined} />
              <Figure
                label="Memory"
                value={memUsed !== undefined ? bytes(memUsed) : undefined}
                note={device.memTotalKB ? `of ${bytes(device.memTotalKB * 1024)}` : undefined}
              />
              <Figure label="Storage free" value={device.disk ? bytes(device.disk.freeBytes) : undefined} note={device.disk ? `of ${bytes(device.disk.totalBytes)}` : undefined} />
            </Figures>
          </Plate>
        ) : null}

        {snapshot ? (
          <Plate label="Now playing">
            {game ? (
              <>
                <Text style={styles.name}>{game.name}</Text>
                <Text style={type.body}>
                  {game.systemName}
                  {game.seconds !== undefined ? `  ·  ${game.sinceKnown === false ? 'at least ' : ''}${duration(game.seconds)}` : ''}
                </Text>
              </>
            ) : (
              <Text style={type.body}>{snapshot.nowPlaying?.available === false ? "EmulationStation isn't running." : 'Nothing is being played.'}</Text>
            )}
          </Plate>
        ) : null}

        {saved ? (
          <View style={styles.actions}>
            <Button primary label="Open BatoX" onPress={() => Linking.openURL(consoleUrl(saved))} />
            <Button label="Forget this console" onPress={forget} />
          </View>
        ) : null}
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  name: { fontFamily: fonts.light, fontSize: 24, color: colors.ink },
  strong: { color: colors.ink },
  badges: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, fontFamily: fonts.regular, fontSize: 14 },
  online: { color: colors.ok, backgroundColor: 'rgba(77, 217, 139, 0.16)' },
  offline: { color: colors.danger, backgroundColor: 'rgba(252, 108, 105, 0.16)' },
  neutral: { color: colors.ink2, backgroundColor: colors.surface2 },
  actions: { gap: space.s, marginTop: space.m },
});

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { displayAddress } from '@/batox/address';
import {
  ApiError,
  getDevice,
  getNowPlaying,
  getStatus,
  mediaSource,
  quitGame,
  reboot,
  shutdown,
  type Device,
  type NowPlaying,
  type Status,
} from '@/batox/api';
import { useConsole } from '@/batox/console-context';
import { getConsole, saveConsole, type SavedConsole } from '@/batox/consoles';
import { bytes, duration, shortVersion } from '@/batox/format';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Meter, Meters, type Level } from '@/components/meter';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

type Snapshot = { status: Status; device: Device; nowPlaying: NowPlaying | null };

// The same thresholds as the web panel's dashboard
const fractionLevel = (f: number): Level => (f >= 0.9 ? 'hot' : f >= 0.75 ? 'warn' : 'ok');
const tempLevel = (t: number): Level => (t >= 75 ? 'hot' : t >= 60 ? 'warn' : 'ok');
const pct = (f: number) => `${Math.round(f * 100)}%`;

// A console's home, as the web panel's dashboard: the console over the sunset, the game being
// played, and its temperature, memory, storage and time on, with bars that turn yellow then red
export default function Home() {
  const { id } = useConsole();
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
      // A failure to read the running game must not hide the rest
      const [status, device, nowPlaying] = await Promise.all([getStatus(entry), getDevice(entry), getNowPlaying(entry).catch(() => null)]);
      setSnapshot({ status, device, nowPlaying });
      setError(null);
      const name = device.model || entry.name;
      if (status.version !== entry.version || name !== entry.name) await saveConsole({ ...entry, name, version: status.version }).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(String(e)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), 10000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const power = (kind: 'reboot' | 'shutdown') => {
    if (!saved) return;
    const restart = kind === 'reboot';
    Alert.alert(
      restart ? 'Reboot the console?' : 'Shut down the console?',
      restart
        ? 'Any running game is closed without saving. BatoX comes back on its own in about a minute.'
        : 'Any running game is closed without saving. To turn it back on, use its power button or power supply.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: restart ? 'Reboot' : 'Shut down',
          style: 'destructive',
          onPress: async () => {
            try {
              await (restart ? reboot(saved) : shutdown(saved));
            } catch (e) {
              Alert.alert(restart ? "Couldn't reboot" : "Couldn't shut down", e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  };

  const closeGame = (name: string) => {
    if (!saved) return;
    Alert.alert(`Close ${name}?`, "The game closes right away. Progress that wasn't saved is lost.", [
      { text: 'Keep playing', style: 'cancel' },
      {
        text: 'Close the game',
        style: 'destructive',
        onPress: async () => {
          try {
            await quitGame(saved);
          } catch (e) {
            Alert.alert("Couldn't close the game", e instanceof Error ? e.message : String(e));
          }
          setTimeout(() => void load(), 1500);
        },
      },
    ]);
  };

  const device = snapshot?.device;
  const status = snapshot?.status;
  const game = snapshot?.nowPlaying?.playing ? snapshot.nowPlaying.game : undefined;
  const memUsed = device?.memTotalKB ? 1 - (device.memAvailableKB ?? 0) / device.memTotalKB : undefined;
  const disk = device?.disk;
  const diskUsed = disk?.totalBytes ? disk.usedBytes / disk.totalBytes : undefined;
  const temp = device?.temperatureC;
  const tLevel = temp !== undefined ? tempLevel(temp) : 'ok';
  const tags = [
    status?.version && `BatoX ${status.version}`,
    device?.batoceraVersion && `Batocera ${shortVersion(device.batoceraVersion)}`,
    device?.kernel && `Kernel ${device.kernel}`,
    device?.cpus && `${device.cpus} cores`,
    device?.arch,
  ].filter(Boolean) as string[];

  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}>
        {loading ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

        {!loading && !saved ? (
          <Plate label="Not found">
            <Text style={type.body}>This console isn&apos;t on this phone anymore.</Text>
          </Plate>
        ) : null}

        {saved ? (
          <View style={styles.hero}>
            <Image source={require('@/assets/images/plate.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" />
            <Text style={styles.host}>{device?.hostname || displayAddress(saved)}</Text>
            <Text style={styles.model}>{device?.model || saved.name}</Text>
            <View style={styles.tags}>
              {error ? (
                <Text style={[styles.tag, styles.offline]}>Not reachable</Text>
              ) : (
                tags.map((t) => (
                  <Text key={t} style={styles.tag}>
                    {t}
                  </Text>
                ))
              )}
            </View>
            {snapshot && !error ? (
              <View style={styles.power}>
                <Pressable accessibilityRole="button" onPress={() => power('reboot')} style={({ pressed }) => [styles.powerButton, pressed && styles.powerPressed]}>
                  <Text style={styles.powerText}>Reboot</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => power('shutdown')} style={({ pressed }) => [styles.powerButton, pressed && styles.powerPressed]}>
                  <Text style={styles.powerText}>Shut down</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <Plate label={error.status === 401 ? 'Token refused' : "Couldn't reach BatoX"} tone="error">
            <Text style={[type.body, styles.strong]}>{error.message}</Text>
            {error.status === 401 ? (
              <Button label="Change the token" onPress={() => router.push({ pathname: '/connect', params: { address: saved ? displayAddress(saved) : '' } })} />
            ) : (
              <Button label="Try again" onPress={refresh} />
            )}
          </Plate>
        ) : null}

        {game && saved ? (
          <View style={styles.playing}>
            <View style={styles.cover}>
              {game.hasCover ? (
                <Image source={{ ...mediaSource(saved, '/now-playing/cover'), cacheKey: `now-playing:${game.path ?? game.name}` }} style={styles.coverImage} contentFit="contain" transition={200} />
              ) : (
                <Image source={require('@/assets/images/icon.png')} style={styles.coverMark} contentFit="contain" />
              )}
            </View>
            <View style={styles.playingInfo}>
              <Text style={styles.playingLabel}>● Now playing</Text>
              <Text style={styles.playingName} numberOfLines={3}>
                {game.name}
              </Text>
              <Text style={styles.playingMeta}>
                {game.systemName}
                {game.seconds !== undefined ? `\n${game.sinceKnown === false ? 'Playing for at least' : 'Playing for'} ${duration(game.seconds)}` : ''}
                {`\n${game.playCount === 1 ? 'Played once before' : game.playCount ? `Played ${game.playCount} times before` : 'First time playing'}`}
              </Text>
              <View style={styles.playingActions}>
                {game.romId ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/console/[id]/games/game/[rom]', params: { id, rom: game.romId! } })}
                    style={({ pressed }) => [styles.small, pressed && styles.smallPressed]}>
                    <Text style={styles.smallText}>Details</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" onPress={() => closeGame(game.name)} style={({ pressed }) => [styles.small, styles.smallDanger, pressed && styles.smallPressed]}>
                  <Text style={[styles.smallText, styles.dangerText]}>Close game</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {device ? (
          <Meters>
            <Meter
              label="Temperature"
              value={temp !== undefined ? `${temp.toFixed(1)} °C` : '-'}
              note={tLevel === 'hot' ? 'Very hot: a Pi slows down near 80 °C' : tLevel === 'warn' ? 'Warm, still within the normal range' : 'Normal'}
              fraction={temp !== undefined ? temp / 85 : 0}
              level={tLevel}
            />
            <Meter
              label="Memory"
              value={memUsed !== undefined ? pct(memUsed) : '-'}
              note={device.memTotalKB ? `${bytes((device.memAvailableKB ?? 0) * 1024)} free of ${bytes(device.memTotalKB * 1024)}` : undefined}
              fraction={memUsed ?? 0}
              level={fractionLevel(memUsed ?? 0)}
            />
            <Meter
              label="Storage"
              value={diskUsed !== undefined ? pct(diskUsed) : '-'}
              note={disk ? `${bytes(disk.freeBytes)} free of ${bytes(disk.totalBytes)}` : 'Unavailable'}
              fraction={diskUsed ?? 0}
              level={fractionLevel(diskUsed ?? 0)}
            />
            <Meter label="Uptime" value={device.uptimeSeconds !== undefined ? duration(device.uptimeSeconds) : '-'} note={device.loadAvg?.length ? `Load: ${device.loadAvg.join(' / ')}` : undefined} />
          </Meters>
        ) : null}

        {status ? (
          <Plate label="BatoX service">
            <Row label="Version" value={status.version} />
            <Row label="Platform" value={status.platform} />
            <Row label="Running for" value={duration(status.uptimeSeconds)} />
            <Row label="Known systems" value={String(status.systems)} />
          </Plate>
        ) : null}
      </ScrollView>
    </Backdrop>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  hero: { minHeight: 220, padding: space.m, paddingTop: space.l, overflow: 'hidden', backgroundColor: colors.surfaceSolid },
  host: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.72, textTransform: 'uppercase', color: colors.ink, opacity: 0.85 },
  model: { fontFamily: fonts.light, fontSize: 30, lineHeight: 34, color: colors.ink, marginTop: 4, marginBottom: space.m },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 'auto' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surface, color: colors.ink, fontFamily: fonts.regular, fontSize: 13 },
  offline: { color: colors.danger },
  power: { flexDirection: 'row', gap: 8, marginTop: space.m },
  powerButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'transparent' },
  powerPressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  powerText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  playing: { flexDirection: 'row', gap: space.m, backgroundColor: colors.surface, padding: space.m },
  cover: { width: 96, aspectRatio: 3 / 4, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  coverImage: { width: '100%', height: '100%' },
  coverMark: { width: 40, height: 40, opacity: 0.4 },
  playingInfo: { flex: 1, gap: space.xs },
  playingLabel: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.72, textTransform: 'uppercase', color: colors.ok },
  playingName: { fontFamily: fonts.light, fontSize: 20, color: colors.ink },
  playingMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  playingActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  small: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.outline },
  smallDanger: { borderColor: 'rgba(252, 108, 105, 0.5)' },
  smallPressed: { backgroundColor: colors.selected },
  smallText: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  dangerText: { color: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s },
  rowLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  rowValue: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink, textAlign: 'right' },
});

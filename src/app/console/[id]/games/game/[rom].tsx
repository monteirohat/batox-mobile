import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError, deleteRom, getRomDetails, launchRom, mediaSource, type RomDetails } from '@/batox/api';
import { bytes, duration, esDate, esYear, gameName } from '@/batox/format';
import { useConsole } from '@/batox/console-context';
import { markRomsStale } from '@/batox/rom-list';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Figure, Figures } from '@/components/figure';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

// The cover first: box art, then the other pictures EmulationStation scraped
const COVER_ORDER = ['boxart', 'thumbnail', 'image', 'mix', 'titleshot', 'marquee', 'wheel'];

// One game: its picture, what EmulationStation scraped about it, Play on the TV, and Delete
export default function Game() {
  const { id, saved } = useConsole();
  const { rom } = useLocalSearchParams<{ rom: string }>();
  const [details, setDetails] = useState<RomDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    getRomDetails(saved, rom)
      .then(setDetails)
      .catch((e: Error) => setError(e.message));
  }, [saved, rom]);

  const [deleting, setDeleting] = useState(false);
  const remove = () => {
    if (!saved || !details) return;
    Alert.alert('Delete this game?', `${details.rom.name} is deleted from the console. Saves and scraped media are not affected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete game',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRom(saved, rom);
            markRomsStale(id);
            router.back();
          } catch (e) {
            setDeleting(false);
            Alert.alert("Couldn't delete the game", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const play = async (replace = false) => {
    if (!saved || !details) return;
    setLaunching(true);
    setLaunched(null);
    try {
      const result = await launchRom(saved, rom, replace);
      setLaunched(
        result.status === 'playing'
          ? `Playing on the TV${result.replaced ? `, instead of ${result.replaced}` : ''}.`
          : "Sent to the console, but the game hasn't shown up as running yet. If it doesn't open, the console may need to reload its game lists.",
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && !replace) {
        Alert.alert('Another game is running', "Close it and open this one? The other game's unsaved progress is lost.", [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Close it and play', style: 'destructive', onPress: () => void play(true) },
        ]);
      } else {
        Alert.alert("Couldn't open the game", e instanceof Error ? e.message : String(e));
      }
    } finally {
      setLaunching(false);
    }
  };

  const md = details?.metadata ?? {};
  const title = md.name || (details ? gameName(details.rom.name) : '');
  const cover = details?.media.filter((m) => m.type === 'image').sort((a, b) => rank(a.kind) - rank(b.kind))[0];
  const rating = md.rating ? Math.round(Number(md.rating) * 5 * 2) / 2 : undefined;
  const playCount = md.playcount ? Number(md.playcount) : 0;

  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]}>
        {error ? (
          <Plate label="Couldn't read the game" tone="error">
            <Text style={[type.body, styles.strong]}>{error}</Text>
          </Plate>
        ) : !details || !saved ? (
          <ActivityIndicator color={colors.ink} style={styles.loading} />
        ) : (
          <>
            <Plate>
              {cover ? (
                <View style={styles.coverBox}>
                  <Image source={mediaSource(saved, cover.url)} style={styles.cover} contentFit="contain" transition={200} accessibilityLabel={`Cover of ${title}`} />
                </View>
              ) : null}
              <Text style={styles.title}>{title}</Text>
              <Text style={type.body}>
                {[details.systemName, esYear(md.releasedate), md.developer].filter(Boolean).join('  ·  ')}
              </Text>
            </Plate>

            <View style={styles.actions}>
              <Button primary label={launching ? 'Opening on the TV…' : 'Play on the TV'} onPress={() => play()} disabled={launching} />
              {launched ? <Text style={styles.launched}>{launched}</Text> : null}
            </View>

            {md.desc ? (
              <Plate label="About">
                <Text style={styles.desc}>{md.desc}</Text>
              </Plate>
            ) : null}

            <Plate>
              <Figures>
                <Figure label="Publisher" value={md.publisher} words />
                <Figure label="Genre" value={md.genre} words />
                <Figure label="Players" value={md.players} />
                <Figure label="Rating" value={rating !== undefined ? `${rating} / 5` : undefined} />
                <Figure label="Played" value={playCount ? `${playCount} ${playCount === 1 ? 'time' : 'times'}` : '0'} note={esDate(md.lastplayed) ? `last on ${esDate(md.lastplayed)}` : undefined} />
                <Figure label="Play time" value={md.gametime ? duration(Number(md.gametime)) : undefined} />
              </Figures>
              {!details.scraped ? <Text style={styles.note}>EmulationStation has no data on this game yet: scrape it on the console to fill these in.</Text> : null}
            </Plate>

            <Plate label="File">
              <Text style={styles.file}>{details.rom.name}</Text>
              <Text style={styles.note}>{bytes(details.rom.size)}</Text>
              <Button danger label={deleting ? 'Deleting…' : 'Delete game'} onPress={remove} disabled={deleting} />
            </Plate>
          </>
        )}
      </ScrollView>
    </Backdrop>
  );
}

function rank(kind: string): number {
  const i = COVER_ORDER.indexOf(kind);
  return i < 0 ? COVER_ORDER.length : i;
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  coverBox: { backgroundColor: colors.strip, alignItems: 'center', paddingVertical: space.s },
  cover: { width: '100%', height: 260 },
  title: { fontFamily: fonts.light, fontSize: 26, color: colors.ink },
  actions: { gap: space.s, marginVertical: space.s },
  launched: { fontFamily: fonts.regular, fontSize: 14, color: colors.ok, textAlign: 'center' },
  desc: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2 },
  file: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
});

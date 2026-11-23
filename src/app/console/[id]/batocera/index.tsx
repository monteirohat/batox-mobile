import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { categoryLabel, matches, validKey, visible } from '@/batox/batocera';
import { useConsole } from '@/batox/console-context';
import { useBatocera } from '@/batox/use-batocera';
import { Backdrop } from '@/components/backdrop';
import { BatoceraSettingRow } from '@/components/batocera-setting';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

// Every key in batocera.conf, by category: the general ones, then one per game system. A search
// looks through all of them; a key that isn't in the list (a per-game one) can be added.
export default function BatoceraSettings() {
  const { id, saved } = useConsole();
  const { data, systems, error, load, save } = useBatocera(saved);
  const [search, setSearch] = useState('');
  const [suggested, setSuggested] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const cats = useMemo(() => (data ? visible(data.categories, suggested) : []), [data, suggested]);
  const isSystem = (name: string) => Object.prototype.hasOwnProperty.call(systems, name);
  const general = cats.filter((c) => !isSystem(c.name));
  const perSystem = cats.filter((c) => isSystem(c.name));
  const q = search.trim();
  const found = q ? cats.map((c) => ({ ...c, settings: c.settings.filter((s) => matches(s, q)) })).filter((c) => c.settings.length) : [];

  const openScreen = (screen: 'audio' | 'video') => router.push(screen === 'audio' ? { pathname: '/console/[id]/audio', params: { id } } : { pathname: '/console/[id]/video', params: { id } });

  const addKey = async () => {
    const key = newKey.trim();
    setAdding(true);
    setAdded(null);
    const ok = await save(key, newValue);
    setAdding(false);
    if (ok) {
      setAdded(`${key} saved.`);
      setNewKey('');
      setNewValue('');
    }
  };

  const group = (title: string, list: typeof cats) =>
    list.length ? (
      <Plate label={title}>
        {list.map((c) => (
          <Pressable
            key={c.name}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/console/[id]/batocera/[category]', params: { id, category: c.name, all: suggested ? '1' : '0' } })}
            style={({ pressed }) => [styles.cat, pressed && styles.catPressed]}>
            <Text style={styles.catName} numberOfLines={1}>
              {categoryLabel(c.name, systems)}
            </Text>
            <Text style={styles.catCount}>{c.settings.length}</Text>
          </Pressable>
        ))}
      </Plate>
    ) : null;

  return (
    <Backdrop>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={page.scroller}
          contentContainerStyle={[styles.scroll, page.content]}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.ink} />}>
          <Text style={[type.body, styles.intro]}>
            Every key in batocera.conf, grouped by category. On and Off, lists and ranges save as soon as you change them. Some changes only take effect after restarting EmulationStation or the console.
          </Text>

          <Field value={search} onChangeText={setSearch} placeholder="Search by name, key, value or description" accessibilityLabel="Search settings" />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show keys that aren&apos;t set</Text>
            <Switch value={suggested} onValueChange={setSuggested} trackColor={{ true: colors.accent, false: colors.surface2 }} thumbColor={colors.ink} />
          </View>

          {error ? (
            <Plate label="Couldn't read batocera.conf" tone="error">
              <Text style={[type.body, styles.strong]}>{error}</Text>
            </Plate>
          ) : null}
          {!data && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}

          {data && !cats.length ? (
            <Plate>
              <Text style={styles.name}>No settings found</Text>
              <Text style={type.body}>The file {data.file || 'batocera.conf'} is empty or missing.</Text>
            </Plate>
          ) : null}

          {data && q ? (
            found.length ? (
              found.map((c) => (
                <View key={c.name} style={styles.results}>
                  <Text style={[type.label, styles.groupTitle]}>{categoryLabel(c.name, systems)}</Text>
                  {c.settings.map((s) => (
                    <BatoceraSettingRow key={s.key} category={c.name} setting={s} onSave={save} onOpenScreen={openScreen} />
                  ))}
                </View>
              ))
            ) : (
              <Plate>
                <Text style={styles.name}>Nothing found</Text>
                <Text style={type.body}>No key matches your search.</Text>
              </Plate>
            )
          ) : null}

          {data && !q ? (
            <>
              {group('General', general)}
              {group('Per game system', perSystem)}
            </>
          ) : null}

          {data ? (
            <Plate label="Add a key">
              <Text style={type.body}>For a key that isn&apos;t in the list, such as a per-game setting.</Text>
              <Field label="Key" value={newKey} onChangeText={setNewKey} placeholder='e.g. gba["Game.gba"].core' />
              <Field label="Value" value={newValue} onChangeText={setNewValue} />
              {newKey.trim() && !validKey(newKey.trim()) ? <Text style={styles.warn}>A key has no spaces or &quot;=&quot;, and doesn&apos;t start with # or -.</Text> : null}
              <Button primary label={adding ? 'Saving…' : 'Save key'} onPress={addKey} disabled={adding || !validKey(newKey.trim())} />
              {added ? <Text style={styles.ok}>{added}</Text> : null}
            </Plate>
          ) : null}

          {data?.file ? <Text style={styles.file}>File: {data.file}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  intro: { marginBottom: space.s },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  name: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s, marginVertical: space.s },
  switchLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  cat: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.surface2, borderWidth: 2, borderColor: 'transparent' },
  catPressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  catName: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  catCount: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2, fontVariant: ['tabular-nums'] },
  results: { gap: 5 },
  groupTitle: { marginTop: space.s, marginBottom: 2 },
  warn: { fontFamily: fonts.regular, fontSize: 13, color: colors.signal },
  ok: { fontFamily: fonts.regular, fontSize: 14, color: colors.ok },
  file: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink3, marginTop: space.s },
});

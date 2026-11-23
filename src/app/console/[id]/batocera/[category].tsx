import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import { categoryLabel, visible } from '@/batox/batocera';
import { useConsole } from '@/batox/console-context';
import { useBatocera } from '@/batox/use-batocera';
import { Backdrop } from '@/components/backdrop';
import { BatoceraSettingRow } from '@/components/batocera-setting';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, space, type } from '@/theme/tokens';

// The keys of one category of batocera.conf, each with its control
export default function BatoceraCategory() {
  const { id, saved } = useConsole();
  const { category, all } = useLocalSearchParams<{ category: string; all?: string }>();
  const { data, systems, error, load, save } = useBatocera(saved);
  const [refreshing, setRefreshing] = useState(false);

  const cat = data ? visible(data.categories, all !== '0').find((c) => c.name === category) : undefined;
  const openScreen = (screen: 'audio' | 'video') => router.push(screen === 'audio' ? { pathname: '/console/[id]/audio', params: { id } } : { pathname: '/console/[id]/video', params: { id } });

  return (
    <Backdrop>
      <Stack.Screen options={{ title: categoryLabel(category, systems) }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={page.scroller}
          contentContainerStyle={[styles.scroll, page.content]}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.ink} />}>
          {error ? (
            <Plate label="Couldn't read batocera.conf" tone="error">
              <Text style={[type.body, styles.strong]}>{error}</Text>
            </Plate>
          ) : null}
          {!data && !error ? <ActivityIndicator color={colors.ink} style={styles.loading} /> : null}
          {data ? <Text style={[type.label, styles.head]}>Keys starting with {category}</Text> : null}
          {data && !cat ? (
            <Plate>
              <Text style={type.body}>No keys in this category.</Text>
            </Plate>
          ) : null}
          {cat?.settings.map((s) => <BatoceraSettingRow key={s.key} category={category} setting={s} onSave={save} onOpenScreen={openScreen} />)}
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  loading: { marginTop: space.xl },
  strong: { color: colors.ink },
  head: { marginBottom: space.xs },
});

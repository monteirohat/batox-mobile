import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, space, type } from '@/theme/tokens';

import { Button } from './button';
import { Field } from './field';

export type Choice = { value: string; label: string };

// A choice among many (a core, a shader, a keyboard layout): a full screen list with a search when
// it is long, the current one in its white frame
export function ChoiceSheet({ title, choices, value, visible, onPick, onClose }: { title: string; choices: Choice[]; value: string | null; visible: boolean; onPick: (value: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? choices.filter((c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)) : choices;
  }, [choices, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.root}>
        <View style={styles.head}>
          <Text style={type.label}>Choose</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {choices.length > 12 ? <Field value={query} onChangeText={setQuery} placeholder={`Search ${choices.length} choices`} accessibilityLabel="Search choices" /> : null}
        </View>
        <FlatList
          data={shown}
          keyExtractor={(c) => c.value}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={30}
          ListEmptyComponent={<Text style={type.body}>Nothing matches.</Text>}
          renderItem={({ item }) => {
            const selected = item.value === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onPick(item.value);
                  setQuery('');
                }}
                style={({ pressed }) => [styles.item, selected && styles.selected, pressed && !selected && styles.pressed]}>
                <Text style={styles.label}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
        <View style={styles.foot}>
          <Button
            label="Close"
            onPress={() => {
              setQuery('');
              onClose();
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSolid },
  head: { paddingHorizontal: space.side, paddingTop: space.m, paddingBottom: space.s, gap: space.s, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  list: { padding: space.s, gap: 2 },
  item: { paddingHorizontal: 14, paddingVertical: 13, borderWidth: 2, borderColor: 'transparent' },
  selected: { backgroundColor: colors.selected, borderColor: colors.frame },
  pressed: { backgroundColor: colors.surface2 },
  label: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  foot: { padding: space.s, borderTopWidth: 1, borderTopColor: colors.line },
});

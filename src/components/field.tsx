import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, space, type } from '@/theme/tokens';

// A label in capitals over its input, as on the web panel's forms
export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.ink3}
        selectionColor={colors.link}
        autoCapitalize="none"
        autoCorrect={false}
        {...input}
        style={[styles.input, input.editable === false && styles.disabled]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    backgroundColor: colors.surface2,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  disabled: { opacity: 0.55 },
});

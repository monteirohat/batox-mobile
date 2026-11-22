import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, type } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  // The main action of a screen: the selected surface in its white frame. Others are a thin outline.
  primary?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, primary, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary && styles.primary,
        pressed && (primary ? styles.primaryPressed : styles.pressed),
        disabled && styles.disabled,
      ]}>
      <Text style={[type.button, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  pressed: { backgroundColor: colors.selected, borderColor: colors.frame },
  primary: { backgroundColor: colors.selected, borderColor: colors.frame, borderWidth: 2 },
  primaryPressed: { backgroundColor: colors.selectedPressed },
  primaryText: { fontFamily: fonts.semibold },
  disabled: { opacity: 0.55 },
});

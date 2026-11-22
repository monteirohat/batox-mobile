import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, type } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  // The main action of a screen: the selected surface in its white frame. Others are a thin outline.
  primary?: boolean;
  // An action that loses something (closing a game, cancelling a timer): red text and edge
  danger?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, primary, danger, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary && styles.primary,
        danger && styles.danger,
        pressed && (primary ? styles.primaryPressed : danger ? styles.dangerPressed : styles.pressed),
        disabled && styles.disabled,
      ]}>
      <Text style={[type.button, primary && styles.primaryText, danger && styles.dangerText]}>{label}</Text>
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
  danger: { borderColor: 'rgba(252, 108, 105, 0.5)' },
  dangerPressed: { backgroundColor: 'rgba(252, 108, 105, 0.16)' },
  dangerText: { color: colors.danger },
  disabled: { opacity: 0.55 },
});

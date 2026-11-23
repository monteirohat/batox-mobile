import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';

import { headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// The extensions: the list, then one extension's settings and log
export default function ExtensionsLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Extensions', headerLeft: () => <DrawerToggleButton tintColor={colors.ink} /> }} />
      <Stack.Screen name="[ext]" options={{ title: 'Extension' }} />
    </Stack>
  );
}

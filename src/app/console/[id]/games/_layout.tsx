import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';

import { headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// The games: systems, a system's games, a game. The first one opens the side menu; the others go back.
export default function GamesLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Games', headerLeft: () => <DrawerToggleButton tintColor={colors.ink} /> }} />
      <Stack.Screen name="[system]" options={{ title: 'Games' }} />
      <Stack.Screen name="game/[rom]" options={{ title: 'Game' }} />
    </Stack>
  );
}

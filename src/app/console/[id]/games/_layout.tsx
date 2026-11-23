import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';

import { headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// The games: the list of every game, then a game. The list opens the side menu; a game goes back.
export default function GamesLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Games', headerLeft: () => <DrawerToggleButton tintColor={colors.ink} /> }} />
      <Stack.Screen name="game/[rom]" options={{ title: 'Game' }} />
    </Stack>
  );
}

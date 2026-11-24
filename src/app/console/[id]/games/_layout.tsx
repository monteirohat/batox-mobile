import { Stack } from 'expo-router';

import { drawerButtonOptions, headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// The games: the list of every game, then a game. The list opens the side menu; a game goes back.
export default function GamesLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Games', ...drawerButtonOptions }} />
      <Stack.Screen name="game/[rom]" options={{ title: 'Game' }} />
    </Stack>
  );
}

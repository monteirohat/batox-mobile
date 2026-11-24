import { Stack } from 'expo-router';

import { drawerButtonOptions, headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// The consoles: every system Batocera can emulate, then one of them
export default function ConsolesLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Consoles', ...drawerButtonOptions }} />
      <Stack.Screen name="[name]" options={{ title: 'Console' }} />
    </Stack>
  );
}

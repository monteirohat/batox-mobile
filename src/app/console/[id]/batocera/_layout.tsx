import { Stack } from 'expo-router';

import { drawerButtonOptions, headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// Batocera's settings: the categories (and a search over every key), then one category's keys
export default function BatoceraLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Batocera settings', ...drawerButtonOptions }} />
      <Stack.Screen name="[category]" options={{ title: 'Settings' }} />
    </Stack>
  );
}

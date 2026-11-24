import { Stack } from 'expo-router';

import { drawerButtonOptions, headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// The extensions: the list, then one extension's settings and log
export default function ExtensionsLayout() {
  return (
    <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Extensions', ...drawerButtonOptions }} />
      <Stack.Screen name="[ext]" options={{ title: 'Extension' }} />
    </Stack>
  );
}

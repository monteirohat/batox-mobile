import '@/polyfills';

import { Inter_300Light, Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// The splash (the wordmark on the dark background) stays until the fonts are in, then fades
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

// The app's screens: the welcome (which opens the last console straight away), installing and
// connecting, the list of consoles, and a console with its own side menu
export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_300Light, Inter_400Regular, Inter_600SemiBold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="install" options={{ title: 'Install BatoX' }} />
        <Stack.Screen name="connect" options={{ title: 'Connect' }} />
        <Stack.Screen name="consoles" options={{ title: 'Consoles' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
        <Stack.Screen name="console/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

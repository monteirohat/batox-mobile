import '@/polyfills';

import { Inter_300Light, Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

// The bar over a screen: dark like the theme's top bar, so content scrolling under it stays out of
// the way of the title
const HeaderBackground = () => <View style={{ flex: 1, backgroundColor: colors.header }} />;

// The splash (the wordmark on the dark background) stays until the fonts are in, then fades
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_300Light, Inter_400Regular, Inter_600SemiBold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerBackground: HeaderBackground,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.regular },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="install" options={{ title: 'Install BatoX' }} />
        <Stack.Screen name="connect" options={{ title: 'Connect' }} />
        <Stack.Screen name="console/[id]/index" options={{ title: 'Console' }} />
        <Stack.Screen name="console/[id]/message" options={{ title: 'Message' }} />
        <Stack.Screen name="console/[id]/timer" options={{ title: 'Timer' }} />
        <Stack.Screen name="console/[id]/games/index" options={{ title: 'Games' }} />
        <Stack.Screen name="console/[id]/games/[system]" options={{ title: 'Games' }} />
        <Stack.Screen name="console/[id]/game/[rom]" options={{ title: 'Game' }} />
        <Stack.Screen name="console/[id]/upload" options={{ title: 'Upload games' }} />
        <Stack.Screen name="console/[id]/music" options={{ title: 'Music' }} />
      </Stack>
    </>
  );
}

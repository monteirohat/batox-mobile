import { router, useLocalSearchParams } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConsoleProvider } from '@/batox/console-context';
import { listConsoles, setCurrentConsoleId } from '@/batox/consoles';
import { openWelcome } from '@/batox/navigation';
import { useSavedConsole } from '@/batox/use-console';
import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { ConsoleMenu } from '@/components/console-menu';
import { headerOptions } from '@/components/header';
import { Plate } from '@/components/plate';
import { colors, space, type } from '@/theme/tokens';

// A console: its screens behind a side menu, opened from the bar's menu button or by swiping from
// the left edge. Opening a console makes it the one the app starts on.
export default function ConsoleLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useSavedConsole(id);

  useEffect(() => {
    if (saved) void setCurrentConsoleId(id);
  }, [id, saved]);

  // An address the phone doesn't know (forgotten, or a stale link): no screen could load anything
  if (saved === null) return <UnknownConsole id={id} />;

  return (
    <ConsoleProvider value={{ id, saved }}>
      <Drawer
        drawerContent={(props) => <ConsoleMenu {...props} console={saved} />}
        screenOptions={{
          ...headerOptions,
          drawerStyle: { backgroundColor: colors.surfaceSolid, width: 300 },
          overlayColor: 'rgba(5, 11, 26, 0.7)',
          sceneStyle: { backgroundColor: colors.bg },
        }}>
        <Drawer.Screen name="index" options={{ title: 'Home' }} />
        <Drawer.Screen name="games" options={{ title: 'Games', headerShown: false }} />
        <Drawer.Screen name="consoles" options={{ title: 'Consoles', headerShown: false }} />
        <Drawer.Screen name="upload" options={{ title: 'Upload games' }} />
        <Drawer.Screen name="bios" options={{ title: 'BIOS' }} />
        <Drawer.Screen name="library" options={{ title: 'Library' }} />
        <Drawer.Screen name="music" options={{ title: 'Music' }} />
        <Drawer.Screen name="message" options={{ title: 'Messages' }} />
        <Drawer.Screen name="timer" options={{ title: 'Timer' }} />
        <Drawer.Screen name="es" options={{ title: 'EmulationStation' }} />
        <Drawer.Screen name="video" options={{ title: 'Video' }} />
        <Drawer.Screen name="audio" options={{ title: 'Audio' }} />
        <Drawer.Screen name="batocera" options={{ title: 'Batocera settings', headerShown: false }} />
        <Drawer.Screen name="extensions" options={{ title: 'Extensions', headerShown: false }} />
        <Drawer.Screen name="logs" options={{ title: 'Logs' }} />
        <Drawer.Screen name="access" options={{ title: 'Access' }} />
      </Drawer>
    </ConsoleProvider>
  );
}

function UnknownConsole({ id }: { id: string }) {
  const leave = async () => {
    if ((await listConsoles()).length) router.replace('/consoles');
    else openWelcome();
  };
  return (
    <Backdrop>
      <View style={styles.box}>
        <Plate label="Not on this phone">
          <Text style={type.body}>This phone doesn&apos;t know a console at {id}. It may have been forgotten.</Text>
          <Button primary label="Choose a console" onPress={() => void leave()} />
        </Plate>
      </View>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  box: { paddingTop: 72, gap: space.s },
});

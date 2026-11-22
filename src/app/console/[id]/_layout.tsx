import { useLocalSearchParams } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useEffect } from 'react';

import { ConsoleProvider } from '@/batox/console-context';
import { setCurrentConsoleId } from '@/batox/consoles';
import { useSavedConsole } from '@/batox/use-console';
import { ConsoleMenu } from '@/components/console-menu';
import { headerOptions } from '@/components/header';
import { colors } from '@/theme/tokens';

// A console: its screens behind a side menu, opened from the bar's menu button or by swiping from
// the left edge. Opening a console makes it the one the app starts on.
export default function ConsoleLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useSavedConsole(id);

  useEffect(() => {
    void setCurrentConsoleId(id);
  }, [id]);

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
        <Drawer.Screen name="upload" options={{ title: 'Upload games' }} />
        <Drawer.Screen name="music" options={{ title: 'Music' }} />
        <Drawer.Screen name="message" options={{ title: 'Messages' }} />
        <Drawer.Screen name="timer" options={{ title: 'Timer' }} />
      </Drawer>
    </ConsoleProvider>
  );
}

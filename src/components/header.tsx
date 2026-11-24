import { DrawerToggleButton } from 'expo-router/drawer';
import { View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

// The bar over a screen: dark like the theme's top bar, so content scrolling under it stays out of
// the way of the title
export const HeaderBackground = () => <View style={{ flex: 1, backgroundColor: colors.header }} />;

// The same header on every navigator: transparent over the picture, with that dark bar behind it
export const headerOptions = {
  headerTransparent: true,
  headerBackground: HeaderBackground,
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fonts.regular },
  headerShadowVisible: false,
} as const;

// The side menu's button, for the first screen of a section with its own stack (Games, Consoles,
// Batocera, Extensions). On iOS 26 and later the system draws a glass capsule behind header
// buttons; the screens under the drawer's own header have none, so this one goes without it too.
// Android uses headerLeft; iOS uses the header items when they are given.
const drawerButton = () => <DrawerToggleButton tintColor={colors.ink} />;
export const drawerButtonOptions = {
  headerLeft: drawerButton,
  unstable_headerLeftItems: () => [{ type: 'custom' as const, element: drawerButton(), hidesSharedBackground: true }],
};

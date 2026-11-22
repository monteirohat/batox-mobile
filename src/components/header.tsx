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

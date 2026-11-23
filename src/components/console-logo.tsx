import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { mediaSource, type ConsoleSystem, type Endpoint } from '@/batox/api';
import { cachedLogo, cutOf, loadLogo, logoAsName, type Logo } from '@/batox/logos';
import { colors, fonts } from '@/theme/tokens';

// A system's logo in white, as on the web panel; its name in capitals while the logo loads, or
// when it has none
export function ConsoleLogo({ endpoint, system, height, style }: { endpoint: Endpoint; system: ConsoleSystem; height: number; style?: ViewStyle }) {
  const theme = system.theme || system.name;
  const wanted = system.hasLogo && !logoAsName(theme);
  const [logo, setLogo] = useState<Logo | undefined>(() => (wanted ? cachedLogo(endpoint, system.name) : { kind: 'none' }));

  useEffect(() => {
    if (!wanted || logo) return;
    let live = true;
    void loadLogo(endpoint, system.name, cutOf(theme)).then((l) => live && setLogo(l));
    return () => {
      live = false;
    };
  }, [endpoint, system.name, theme, wanted, logo]);

  return (
    <View style={[styles.box, { height: height + 16 }, style]} accessibilityLabel={system.fullName}>
      {logo?.kind === 'svg' ? (
        <SvgXml xml={logo.xml} width="88%" height={height} />
      ) : logo?.kind === 'image' ? (
        <Image
          source={{ ...mediaSource(endpoint, `/consoles/${encodeURIComponent(system.name)}/logo`), cacheKey: `logo:${endpoint.host}:${system.name}` }}
          style={{ width: '88%', height }}
          contentFit="contain"
          tintColor={colors.ink}
        />
      ) : (
        <Text style={[styles.name, { fontSize: Math.min(17, height * 0.42) }]} numberOfLines={2}>
          {system.fullName}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontFamily: fonts.semibold, color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
});

import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { Plate } from '@/components/plate';
import { page } from '@/theme/page';
import { colors, fonts, space, type } from '@/theme/tokens';

const REPO = 'https://github.com/monteirohat/batox-mobile';
const BATOX = 'https://github.com/monteirohat/BatoX';
const PRIVACY = `${REPO}/blob/main/PRIVACY.md`;
const EMAIL = 'info@algore.com.br';

const version = Constants.expoConfig?.version ?? '';
const system = Platform.OS === 'android' ? `Android (API ${Platform.Version})` : `iOS ${Platform.Version}`;

// A new issue on GitHub, with what helps to answer it already filled in
function reportUrl(): string {
  const body = [
    '**What happened**',
    '',
    '',
    '**What you expected**',
    '',
    '',
    '**Steps to see it**',
    '1. ',
    '',
    '---',
    `App: BatoX ${version}`,
    `Phone: ${system}`,
    'BatoX on the console: (the version on the console\'s Home screen)',
  ].join('\n');
  return `${REPO}/issues/new?body=${encodeURIComponent(body)}`;
}

// About the app: its version, where to report a problem, the source code, who publishes it, the
// privacy policy and the license
export default function About() {
  return (
    <Backdrop>
      <ScrollView style={page.scroller} contentContainerStyle={[styles.scroll, page.content]}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/wordmark.png')} style={styles.wordmark} contentFit="contain" accessibilityLabel="BatoX" />
          <Text style={styles.tagline}>Your Batocera, from your phone.</Text>
          <Text style={type.label}>Version {version}</Text>
        </View>

        <Plate label="Help and feedback">
          <Text style={type.body}>
            Found a problem, or have an idea? Open an issue on GitHub: say what you did and what you expected. The app&apos;s and the phone&apos;s versions are filled in
            for you.
          </Text>
          <Text style={styles.small}>
            GitHub asks you to sign in first. Without an account, write to{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent(`BatoX ${version}`)}`)}>
              {EMAIL}
            </Text>
            .
          </Text>
          <Button primary label="Report a problem" onPress={() => Linking.openURL(reportUrl())} />
          <Button label="See the open issues" onPress={() => Linking.openURL(`${REPO}/issues`)} />
        </Plate>

        <Plate label="Open source">
          <Text style={type.body}>The app and BatoX are free and open source, under the MIT license.</Text>
          <Button label="The app's source code" onPress={() => Linking.openURL(REPO)} />
          <Button label="BatoX, the web panel" onPress={() => Linking.openURL(BATOX)} />
        </Plate>

        <Plate label="Published by">
          <Text style={styles.name}>Algore Tecnologia</Text>
          <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>
            {EMAIL}
          </Text>
          <Button label="Privacy policy" onPress={() => Linking.openURL(PRIVACY)} />
        </Plate>

        <Text style={styles.note}>BatoX is not affiliated with or endorsed by the Batocera project. It doesn&apos;t include or provide any games.</Text>
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 72, paddingBottom: space.xl, gap: 5 },
  hero: { alignItems: 'center', gap: space.s, paddingVertical: space.l },
  wordmark: { width: 220, aspectRatio: 1024 / 411 },
  tagline: { ...type.body, textAlign: 'center' },
  name: { fontFamily: fonts.light, fontSize: 22, color: colors.ink },
  link: { fontFamily: fonts.regular, fontSize: 15, color: colors.link },
  small: { ...type.body, fontSize: 13, lineHeight: 18 },
  note: { ...type.body, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: space.m },
});

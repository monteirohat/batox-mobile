import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Backdrop } from '@/components/backdrop';
import { Button } from '@/components/button';
import { space, type } from '@/theme/tokens';

// The first screen: the name over the sky, the two ways in at the bottom
export default function Welcome() {
  return (
    <Backdrop>
      <View style={styles.top}>
        <Image source={require('@/assets/images/wordmark.png')} style={styles.wordmark} contentFit="contain" accessibilityLabel="BatoX" />
        <Text style={[type.body, styles.tagline]}>Your Batocera, from your phone.</Text>
      </View>
      <View style={styles.actions}>
        <Button primary label="Install BatoX on a console" onPress={() => router.push('/install')} />
        <Button label="I already have BatoX" onPress={() => router.push('/connect')} />
      </View>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  top: { flex: 1, alignItems: 'center', paddingTop: space.xl },
  wordmark: { width: 240, aspectRatio: 1024 / 411 },
  tagline: { marginTop: space.s, textAlign: 'center' },
  actions: { gap: space.s, paddingBottom: space.m },
});

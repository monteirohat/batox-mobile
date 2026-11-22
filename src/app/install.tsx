import { StyleSheet, View } from 'react-native';

import { Backdrop } from '@/components/backdrop';
import { ComingNext } from '@/components/coming-next';
import { space } from '@/theme/tokens';

export default function Install() {
  return (
    <Backdrop>
      <View style={styles.body}>
        <ComingNext
          title="Install over SSH"
          text="Type your console's address, sign in with its SSH login, pick a BatoX version, and the console downloads and installs it. The same steps as the BatoX Installer."
        />
      </View>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', paddingBottom: space.xl },
});

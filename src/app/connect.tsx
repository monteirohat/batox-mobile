import { StyleSheet, View } from 'react-native';

import { Backdrop } from '@/components/backdrop';
import { ComingNext } from '@/components/coming-next';
import { space } from '@/theme/tokens';

export default function Connect() {
  return (
    <Backdrop>
      <View style={styles.body}>
        <ComingNext
          title="Connect to BatoX"
          text="Type the address of a console that already runs BatoX and its access token, and manage it from here."
        />
      </View>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', paddingBottom: space.xl },
});

import { StyleSheet } from 'react-native';

import { space } from './tokens';

// A screen's scrolling list spans the whole width, so its scroll bar sits at the screen's edge and
// the list doesn't look like a box inside the screen; its content keeps the side margin.
export const page = StyleSheet.create({
  scroller: { marginHorizontal: -space.side },
  content: { paddingHorizontal: space.side },
});

import { SvgXml } from 'react-native-svg';

import { ICONS, type IconName } from './icons';

// One of the web panel's line icons, in a color
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

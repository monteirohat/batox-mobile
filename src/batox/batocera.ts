// batocera.conf as the web panel's Batocera screen shows it: keys by category, each with its
// control, the commented-out ones as suggestions

import type { BatoceraCategory, BatoceraChoice, BatoceraControl, BatoceraSetting } from './api';

// Friendly names for the most common batocera.conf prefixes
const CATEGORY_LABELS: Record<string, string> = {
  system: 'System',
  global: 'All emulators',
  audio: 'Audio',
  display: 'Display',
  wifi: 'Wi-Fi',
  wifi2: 'Wi-Fi (network 2)',
  wifi3: 'Wi-Fi (network 3)',
  network: 'Network',
  controllers: 'Controllers',
  updates: 'Updates',
  kodi: 'Kodi',
  splash: 'Splash screen',
  led: 'LEDs',
  power: 'Power',
  es: 'EmulationStation',
  screenshot: 'Screenshots',
  bluetooth: 'Bluetooth',
  backup: 'Backup',
  other: 'Other',
};

// A category's name: a friendly one, a system's full name, or the prefix itself
export function categoryLabel(name: string, systems: Record<string, string>): string {
  return CATEGORY_LABELS[name] || systems[name] || name;
}

export function controlOf(s: BatoceraSetting): BatoceraControl {
  return s.control ?? { type: s.sensitive ? 'password' : 'text' };
}

// The key without its category's prefix: "audio.volume" in Audio is "volume"
export function shortKey(category: string, key: string): string {
  return key.startsWith(`${category}.`) ? key.slice(category.length + 1) : key;
}

// A choice's text: EmulationStation's names are short ("Full"); the comments in batocera.conf
// explain the value ("suspend — Enter standby")
export function choiceText(c: BatoceraChoice, fromFeatures: boolean): string {
  if (!c.label || c.label === c.value) return c.value;
  if (fromFeatures) return c.label;
  return `${c.value} — ${c.label.replace(/\.$/, '')}`;
}

export function matches(s: BatoceraSetting, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const c = controlOf(s);
  return (
    s.key.toLowerCase().includes(q) ||
    (c.label ?? '').toLowerCase().includes(q) ||
    (!s.sensitive && s.value.toLowerCase().includes(q)) ||
    (s.description ?? '').toLowerCase().includes(q)
  );
}

// The categories with the keys to show: all of them, or only those set in the file
export function visible(categories: BatoceraCategory[], withSuggested: boolean): BatoceraCategory[] {
  return categories.map((c) => ({ ...c, settings: withSuggested ? c.settings : c.settings.filter((s) => s.active) })).filter((c) => c.settings.length);
}

// A key BatoX accepts (batoconf.ValidKey): no "=", spaces or line breaks, not a comment, and not
// read as a command-line option
export function validKey(key: string): boolean {
  return key.length > 0 && key.length <= 256 && !/[=\n\r\0 \t]/.test(key) && !key.startsWith('#') && !key.startsWith('-');
}

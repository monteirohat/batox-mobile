// What the JavaScript engine on the phone lacks and the app needs. Imported first, by the root
// layout.

import { getRandomValues } from 'expo-crypto';

// @noble's randomBytes (SSH keys and padding) reads crypto.getRandomValues; expo-crypto provides
// one backed by the system's secure random source
const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (typeof g.crypto?.getRandomValues !== 'function') {
  g.crypto = { ...(g.crypto ?? {}), getRandomValues };
}

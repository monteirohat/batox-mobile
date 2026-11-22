// The consoles this phone knows, kept in the system's secure storage (Keychain on iOS, Keystore on
// Android) since each holds a BatoX access token.

import * as SecureStore from 'expo-secure-store';

export type SavedConsole = {
  host: string;
  port: number;
  token: string;
  name: string;
  version: string;
  hostKey?: string;
  savedAt: string;
};

const KEY = 'batox.consoles';

export async function listConsoles(): Promise<SavedConsole[]> {
  try {
    const text = await SecureStore.getItemAsync(KEY);
    return text ? (JSON.parse(text) as SavedConsole[]) : [];
  } catch {
    return [];
  }
}

// Adds a console, or replaces the one at the same address
export async function saveConsole(console: Omit<SavedConsole, 'savedAt'>): Promise<void> {
  const others = (await listConsoles()).filter((c) => !(c.host === console.host && c.port === console.port));
  await SecureStore.setItemAsync(KEY, JSON.stringify([{ ...console, savedAt: new Date().toISOString() }, ...others]));
}

export async function forgetConsole(host: string, port: number): Promise<void> {
  const rest = (await listConsoles()).filter((c) => !(c.host === host && c.port === port));
  await SecureStore.setItemAsync(KEY, JSON.stringify(rest));
}

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

// A console's id in routes: its address
export function consoleId(c: { host: string; port: number }): string {
  return `${c.host}:${c.port}`;
}

export async function listConsoles(): Promise<SavedConsole[]> {
  try {
    const text = await SecureStore.getItemAsync(KEY);
    return text ? (JSON.parse(text) as SavedConsole[]) : [];
  } catch {
    return [];
  }
}

export async function getConsole(id: string): Promise<SavedConsole | null> {
  return (await listConsoles()).find((c) => consoleId(c) === id) ?? null;
}

// Adds a console, or replaces the one at the same address, keeping its place in the list
export async function saveConsole(console: Omit<SavedConsole, 'savedAt'>): Promise<void> {
  const all = await listConsoles();
  const entry = { ...console, savedAt: new Date().toISOString() };
  const at = all.findIndex((c) => consoleId(c) === consoleId(console));
  const next = at >= 0 ? all.map((c, i) => (i === at ? { ...c, ...entry } : c)) : [entry, ...all];
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
}

export async function forgetConsole(id: string): Promise<void> {
  const rest = (await listConsoles()).filter((c) => consoleId(c) !== id);
  await SecureStore.setItemAsync(KEY, JSON.stringify(rest));
}

const CURRENT = 'batox.current';

// The console the app opens on: the last one used
export async function getCurrentConsoleId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CURRENT);
  } catch {
    return null;
  }
}

export async function setCurrentConsoleId(id: string): Promise<void> {
  await SecureStore.setItemAsync(CURRENT, id).catch(() => undefined);
}

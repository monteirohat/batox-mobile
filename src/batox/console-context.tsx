import { createContext, useContext, type ReactNode } from 'react';

import type { SavedConsole } from './consoles';

type Current = { id: string; saved: SavedConsole | null | undefined };

const ConsoleContext = createContext<Current | null>(null);

// The console the screens under console/[id] work on, given by its layout: the route's id, and the
// saved console (undefined while it loads, null when the phone doesn't know it). Screens in nested
// navigators (the games' stack) don't see the parent route's params, so they read it from here.
export function ConsoleProvider({ value, children }: { value: Current; children: ReactNode }) {
  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole(): Current {
  const current = useContext(ConsoleContext);
  if (!current) throw new Error('useConsole is only for screens under console/[id]');
  return current;
}

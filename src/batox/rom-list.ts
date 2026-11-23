// The Games list loads every game once and keeps it while it stays open. A screen that changes the
// games (an upload, a deletion) marks the console's list as stale, and the list reads it again when
// it comes back into view.

const stale = new Set<string>();

export const markRomsStale = (consoleId: string) => stale.add(consoleId);

// Whether the list must be read again; asking clears the mark
export function takeRomsStale(consoleId: string): boolean {
  return stale.delete(consoleId);
}

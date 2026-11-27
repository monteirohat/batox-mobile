// The BIOS screen's reckoning, apart from the screen so it can be tested: which systems a filter
// shows, the sums above them, and what to say about an upload (BatoX docs/api.md, BIOS).

import type { BiosSystem, BiosUpload } from './api';

export type BiosShow = 'all' | 'incomplete' | 'complete';

export const complete = (s: BiosSystem) => s.found === s.total;

// The systems a filter keeps: with games or not, complete or not, and a search over the system's
// names and its files' names
export function filterBios(systems: BiosSystem[], { show, withGames, search }: { show: BiosShow; withGames: boolean; search: string }): BiosSystem[] {
  const q = search.trim().toLowerCase();
  return systems.filter((s) => {
    if (withGames && !s.games) return false;
    if (show === 'complete' && !complete(s)) return false;
    if (show === 'incomplete' && complete(s)) return false;
    return !q || [s.fullName, s.name, s.title].some((v) => (v ?? '').toLowerCase().includes(q)) || s.files.some((f) => f.name.toLowerCase().includes(q));
  });
}

// "7 of 27 files in place; 2 of 10 systems have them all."
export function biosSummary(systems: BiosSystem[]): string {
  const found = systems.reduce((n, s) => n + s.found, 0);
  const total = systems.reduce((n, s) => n + s.total, 0);
  const done = systems.filter(complete).length;
  return `${found} of ${total} ${total === 1 ? 'file' : 'files'} in place; ${done} of ${systems.length} ${systems.length === 1 ? 'system has' : 'systems have'} them all.`;
}

// "1 of 7 in place", or "All in place"
export function biosProgress(s: BiosSystem): string {
  if (complete(s)) return s.total === 1 ? 'In place' : 'All in place';
  return `${s.found} of ${s.total} in place`;
}

const names = (paths: string[]) => paths.map((p) => p.replace(/^bios\//, '')).join(', ');

// Where an upload went, under its name in the list; warn when the name is right but not the content
export function biosPlaced(res: BiosUpload | undefined, fullName: (system: string) => string): { message: string; warn?: boolean } {
  if (!res) return { message: 'Sent' };
  if (!res.saved.length) return { message: `Already there, as ${names(res.unchanged)}` };
  if (res.match === 'none') return { message: "Not in Batocera's list: saved in the BIOS folder" };
  if (res.match === 'name') return { message: `Saved as ${names(res.saved)}, but it isn't the version Batocera checks for`, warn: true };
  const systems = res.systems.map(fullName);
  const forWhom = systems.length > 3 ? `${systems.slice(0, 3).join(', ')} and ${systems.length - 3} more` : systems.join(', ');
  return { message: `In place as ${names(res.saved)}${forWhom ? ` (${forWhom})` : ''}` };
}

// The folder a file lives in, when it isn't the main BIOS folder ("bios/dc/", "saves/...")
export function biosFolder(path: string): string {
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  return dir === 'bios/' ? '' : dir;
}

import type { Extension } from './api';

// What an extension may do, as the web panel's Extensions screen words it
export const PERMISSIONS: Record<string, [string, string]> = {
  network: ['Uses the network', 'Listens on your local network, for example so phones can find the console.'],
  audio: ['Uses the sound', "Plays sound, and can change the volume of other programs, such as EmulationStation's music."],
  screen: ['Draws on the TV', 'Shows things on the screen, on top of games.'],
  games: ['Controls games', 'Can close or start games.'],
  power: ['Controls the power', 'Can restart or turn off the console.'],
};

const STATES: Record<string, string> = { running: 'Running', stopped: 'Off', restarting: 'Restarting' };

// "Running since 22 Nov, 19:54 · restarted 2 times · last stop: ..."
export function statusLine(x: Extension): { text: string; state: string } {
  const s = x.status ?? { state: 'stopped' as const };
  const state = x.enabled ? s.state : 'stopped';
  let text = STATES[state] ?? state;
  if (state === 'running' && s.since) {
    const d = new Date(s.since);
    if (!Number.isNaN(d.getTime())) text += ` since ${d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  }
  if (state === 'restarting') text += ': it stopped on its own and starts again in a moment';
  if (s.restarts) text += `  ·  restarted ${s.restarts} ${s.restarts === 1 ? 'time' : 'times'}`;
  if (s.error && state !== 'running') text += `  ·  last stop: ${s.error}`;
  return { text, state };
}

// The confirmation before installing: what it may do, and why only the official catalog
export function installWarning(x: Extension): string {
  const perms = (x.permissions ?? []).map((p) => (PERMISSIONS[p]?.[0] ?? p).toLowerCase());
  return `${perms.length ? `It ${perms.join(', ')}. ` : ''}Like every program on Batocera, it runs with full access to the console, so BatoX only installs extensions from the official catalog, after checking the package.`;
}

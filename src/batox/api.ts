// BatoX's HTTP API on the console (BatoX docs/api.md): plain HTTP on the local network, the token
// in the Authorization header.

import { urlHost, type Address } from './address';

export type Endpoint = Address & { token?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Status = {
  systemsSource?: string;
  service: string;
  status: string;
  version: string;
  platform: string;
  uptimeSeconds: number;
  systems: number;
};

export type Device = {
  hostname?: string;
  model?: string;
  batoceraVersion?: string;
  arch?: string;
  cpus?: number;
  uptimeSeconds?: number;
  temperatureC?: number;
  memTotalKB?: number;
  memAvailableKB?: number;
  disk?: { path: string; totalBytes: number; freeBytes: number; usedBytes: number };
  kernel?: string;
  loadAvg?: string[];
};

export type NowPlaying = {
  available: boolean;
  playing?: boolean;
  game?: { name: string; system: string; systemName: string; path?: string; romId?: string; hasCover?: boolean; playCount?: number; seconds?: number; sinceKnown?: boolean };
};

export async function request<T>(endpoint: Endpoint, path: string, options: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const where = `${urlHost(endpoint.host)}:${endpoint.port}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`http://${where}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(endpoint.token ? { Authorization: `Bearer ${endpoint.token}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? `BatoX at ${where} didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`
        : `Couldn't reach BatoX at ${where}. Check the address, and that the phone is on the console's network.`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) {
    throw new ApiError("BatoX refused the token. Copy it again: it is in /userdata/system/batox/token on the console.", 401);
  }
  if (!res.ok) {
    let reason = '';
    try {
      reason = String(((await res.json()) as { error?: string }).error ?? '');
    } catch {
      // not JSON
    }
    throw new ApiError(reason ? `BatoX answered: ${reason}` : `BatoX returned an error (HTTP ${res.status}).`, res.status);
  }
  return (await res.json()) as T;
}

export const getStatus = (e: Endpoint) => request<Status>(e, '/status');
export const getDevice = (e: Endpoint) => request<Device>(e, '/device');
export const getNowPlaying = (e: Endpoint) => request<NowPlaying>(e, '/now-playing');

// Checks an address and a token the way the connect screen needs: is BatoX there, then does it
// take the token. Returns its status and what it says about the machine.
export async function checkConnection(endpoint: Endpoint): Promise<{ status: Status; device: Device | null }> {
  const ping = await request<{ ping?: string }>({ host: endpoint.host, port: endpoint.port }, '/ping');
  if (ping.ping !== 'pong') throw new ApiError(`Something answers at ${urlHost(endpoint.host)}:${endpoint.port}, but it isn't BatoX.`);
  const status = await getStatus(endpoint);
  const device = await getDevice(endpoint).catch(() => null);
  return { status, device };
}

// --- EmulationStation, messages, timer, the running game (BatoX docs/api.md) -------------------

export type EsStatus = {
  available: boolean;
  version?: string;
  idle?: boolean;
  // Whether messages and the timer can be drawn on top of games
  overlay?: boolean;
  runningGame?: { name: string; system: string; path: string } | null;
};

export type MessagePosition = 'top' | 'center' | 'bottom';
export type Message = { text: string; title?: string; position?: MessagePosition; seconds?: number };
export type MessageResult = { status: string; type: string; via: string; text: string };

export type TimerAction = 'close-game' | 'shutdown' | 'none';
export type TimerCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type TimerStatus = {
  active: boolean;
  action?: TimerAction;
  corner?: TimerCorner;
  title?: string;
  startedAt?: string;
  endsAt?: string;
  totalSeconds: number;
  remainingSeconds: number;
  onScreen: boolean;
  last?: { at: string; action: string; outcome?: string; error?: string };
};

export const getEsStatus = (e: Endpoint) => request<EsStatus>(e, '/emulationstation/status');
export const sendMessage = (e: Endpoint, message: Message) => request<MessageResult>(e, '/messages/notify', { method: 'POST', body: message });
export const getTimer = (e: Endpoint) => request<TimerStatus>(e, '/timer');
export const startTimer = (e: Endpoint, timer: { seconds: number; action: TimerAction; corner: TimerCorner; title: string }) =>
  request<TimerStatus>(e, '/timer', { method: 'POST', body: timer });
export const extendTimer = (e: Endpoint, seconds: number) => request<TimerStatus>(e, '/timer/extend', { method: 'POST', body: { seconds } });
export const cancelTimer = (e: Endpoint) => request<{ cancelled: boolean }>(e, '/timer', { method: 'DELETE' });
// Closes the running game at once; unsaved progress is lost
export const quitGame = (e: Endpoint) => request<{ status: string; name: string }>(e, '/now-playing/quit', { method: 'POST' });

// --- Systems and games ---------------------------------------------------------------------------

export type ConsoleSystem = {
  name: string;
  fullName: string;
  manufacturer?: string;
  releaseYear?: number;
  hardware?: string;
  games: number;
  played?: number;
  favorites?: number;
  hasLogo?: boolean;
  // The name themes know it by, when not its own
  theme?: string;
  folder?: string;
  folderExists?: boolean;
  extensions?: string[];
  inEmulationStation?: boolean;
  hidden?: number;
  mostPlayed?: string;
};

export type Rom = { id: string; system: string; name: string; path: string; size: number; addedAt?: string };

export type RomMedia = { kind: string; type: 'image' | 'video' | 'document' | 'file'; url: string };

export type RomDetails = {
  rom: Rom;
  systemName: string;
  scraped: boolean;
  metadata: Record<string, string>;
  media: RomMedia[];
};

export type LaunchResult = { status: 'playing' | 'requested'; name: string; replaced?: string };

export const getConsoles = (e: Endpoint) => request<{ emulationStation: boolean; consoles: ConsoleSystem[] }>(e, '/consoles', { timeoutMs: 15000 });
export const getSystemRoms = (e: Endpoint, system: string) => request<Rom[]>(e, `/roms/system/${encodeURIComponent(system)}`, { timeoutMs: 30000 });
export const getRomDetails = (e: Endpoint, id: string) => request<RomDetails>(e, `/roms/${encodeURIComponent(id)}/details`);
// Opens the game on the TV. 409 when another game runs; replace closes it first (its unsaved
// progress is lost).
export const launchRom = (e: Endpoint, id: string, replace = false) =>
  request<LaunchResult>(e, `/roms/${encodeURIComponent(id)}/launch${replace ? '?replace=true' : ''}`, { method: 'POST', timeoutMs: 30000 });

// A media file of the API (a cover, a logo) as an image source, with the token
export function mediaSource(e: Endpoint, url: string): { uri: string; headers: Record<string, string> } {
  return { uri: `http://${urlHost(e.host)}:${e.port}/api/v1${url}`, headers: e.token ? { Authorization: `Bearer ${e.token}` } : {} };
}

// --- Uploads and music ---------------------------------------------------------------------------

export type RomSystem = { name: string; fullName: string; dir: string; extensions: string[]; romCount: number };

export type MusicTrack = { name: string; folder: string; path: string; size: number; modified: string };
export type MusicLibrary = { dir: string; folders: string[]; tracks: MusicTrack[]; extensions: string[] };

// Every system Batocera knows, for choosing where an upload goes
export const getSystems = (e: Endpoint) => request<RomSystem[]>(e, '/systems?all=true', { timeoutMs: 15000 });
export const getMusic = (e: Endpoint) => request<MusicLibrary>(e, '/music');
export const deleteMusic = (e: Endpoint, path: string) => request<{ status: string; path: string }>(e, `/music?path=${encodeURIComponent(path)}`, { method: 'DELETE' });

// Restarts or turns off the console a second after answering (202)
export const reboot = (e: Endpoint) => request<unknown>(e, '/reboot', { method: 'POST' });
export const shutdown = (e: Endpoint) => request<unknown>(e, '/shutdown', { method: 'POST' });

// --- Extensions (BatoX docs/api.md, the batox-extensions catalog) ---------------------------------

export type ExtensionControl =
  | { type: 'text' }
  | { type: 'toggle' }
  | { type: 'number'; unit?: string }
  | { type: 'select'; choices?: { value: string; label?: string }[] }
  | { type: 'range'; min: number; max: number; step?: number; unit?: string };

export type ExtensionSetting = { key: string; label: string; description?: string; default?: string; control?: ExtensionControl };

export type Extension = {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  homepage?: string;
  permissions?: string[];
  settings?: ExtensionSetting[];
  installed?: string;
  available?: string;
  update?: boolean;
  supported: boolean;
  enabled?: boolean;
  status?: { state: 'running' | 'stopped' | 'restarting'; pid?: number; since?: string; restarts?: number; error?: string };
  values?: Record<string, string>;
};

export type Extensions = {
  platform: string;
  items: Extension[];
  catalogState: 'ok' | 'unpublished' | 'unreachable';
  catalogError?: string;
  catalogUpdated?: string;
};

export type LogLines = { file: string; lines: string[] };

export const getExtensions = (e: Endpoint, refresh = false) => request<Extensions>(e, `/extensions${refresh ? '?refresh=true' : ''}`, { timeoutMs: 20000 });
export const installExtension = (e: Endpoint, id: string) => request<Extensions>(e, `/extensions/${encodeURIComponent(id)}/install`, { method: 'POST', timeoutMs: 120000 });
export const setExtensionEnabled = (e: Endpoint, id: string, enabled: boolean) =>
  request<unknown>(e, `/extensions/${encodeURIComponent(id)}/enabled`, { method: 'PUT', body: { enabled }, timeoutMs: 30000 });
export const saveExtensionSettings = (e: Endpoint, id: string, values: Record<string, string>) =>
  request<unknown>(e, `/extensions/${encodeURIComponent(id)}/settings`, { method: 'PUT', body: { values }, timeoutMs: 30000 });
export const restartExtension = (e: Endpoint, id: string) => request<unknown>(e, `/extensions/${encodeURIComponent(id)}/restart`, { method: 'POST', timeoutMs: 30000 });
export const removeExtension = (e: Endpoint, id: string) => request<unknown>(e, `/extensions/${encodeURIComponent(id)}`, { method: 'DELETE', timeoutMs: 30000 });
export const getExtensionLog = (e: Endpoint, id: string, tail = 300) => request<LogLines>(e, `/extensions/${encodeURIComponent(id)}/log?tail=${tail}`);

// --- Logs ----------------------------------------------------------------------------------------

export const getLogs = (e: Endpoint, kind: 'info' | 'error', tail: number) => request<LogLines>(e, `/logs?type=${kind}&tail=${tail}`);
export const getEsLog = (e: Endpoint, tail: number) => request<LogLines>(e, `/emulationstation/logs?tail=${tail}`);

// --- EmulationStation's controls, settings and theme -----------------------------------------------

export type EsAction = 'reload-gamelists' | 'restart' | 'stop' | 'start';
export type EsSetting = { type: 'bool' | 'int' | 'float' | 'string'; name: string; value: string };

export const esAction = (e: Endpoint, action: EsAction) => request<unknown>(e, `/emulationstation/${action}`, { method: 'POST', timeoutMs: 60000 });
export const getEsSettings = (e: Endpoint) => request<EsSetting[]>(e, '/emulationstation/settings');
// EmulationStation rewrites its file when it exits, so BatoX stops it, writes, and starts it again,
// unless restart is false
export const setEsSetting = (e: Endpoint, name: string, value: string, type?: EsSetting['type'], restart = true) =>
  request<{ status: string; setting: EsSetting; restarted: boolean }>(e, `/emulationstation/settings/${encodeURIComponent(name)}${restart ? '' : '?restart=false'}`, {
    method: 'PUT',
    body: type ? { value, type } : { value },
    timeoutMs: 60000,
  });
export const clearEsLog = (e: Endpoint) => request<unknown>(e, '/emulationstation/logs/clear', { method: 'POST' });

// --- Video and audio -----------------------------------------------------------------------------

export type VideoOutput = { name: string; monitor?: string; manufacturer?: string; preferredMode?: string; active?: boolean; role?: 'main' | 'second' | 'off' };
export type Video = {
  outputs: VideoOutput[];
  settings: { main: string; second: string };
  next: { main: string; second?: string };
  restartNeeded: boolean;
  warning?: string;
};

export type AudioOutput = {
  name: string;
  label: string;
  kind: string;
  description?: string;
  monitor?: string;
  screen?: string;
  screenRole?: 'main' | 'second' | 'off';
  connected?: boolean;
  current?: boolean;
};
export type Audio = { outputs: AudioOutput[]; setting: string; current: string; volume?: number; warning?: string };

export const getVideo = (e: Endpoint) => request<Video>(e, '/video', { timeoutMs: 15000 });
export const setVideo = (e: Endpoint, choice: { main: string; second: string }) => request<Video>(e, '/video', { method: 'PUT', body: choice, timeoutMs: 15000 });
export const getAudio = (e: Endpoint) => request<Audio>(e, '/audio', { timeoutMs: 15000 });
export const setAudio = (e: Endpoint, device: string) => request<Audio>(e, '/audio', { method: 'PUT', body: { device }, timeoutMs: 20000 });
export const testSound = (e: Endpoint) => request<unknown>(e, '/audio/test', { method: 'POST', timeoutMs: 15000 });

// --- Batocera settings ---------------------------------------------------------------------------

export type BatoceraChoice = { value: string; label?: string };
// How a key is edited, chosen by BatoX from batocera.conf's comments and es_features.cfg
export type BatoceraControl = {
  type: 'toggle' | 'select' | 'range' | 'number' | 'text' | 'password' | 'combo' | 'screen';
  label?: string;
  choices?: BatoceraChoice[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  screen?: 'audio' | 'video';
};
// active: set in batocera.conf; otherwise commented out, and value is the example
export type BatoceraSetting = { key: string; value: string; active: boolean; description?: string; sensitive?: boolean; control?: BatoceraControl };
export type BatoceraCategory = { name: string; settings: BatoceraSetting[] };
export type BatoceraSettings = { file: string; categories: BatoceraCategory[] };

export const getBatoceraSettings = (e: Endpoint) => request<BatoceraSettings>(e, '/batocera/settings', { timeoutMs: 20000 });
export const setBatoceraSetting = (e: Endpoint, key: string, value: string) =>
  request<unknown>(e, '/batocera/settings', { method: 'PUT', body: { key, value }, timeoutMs: 20000 });

// --- Library -------------------------------------------------------------------------------------

export type LibraryStatus = 'available' | 'installed' | 'conflict' | 'unsupported';
export type LibraryGame = {
  system: string;
  systemName?: string;
  name: string;
  file: string;
  size: number;
  description?: string;
  developer?: string;
  publisher?: string;
  genre?: string;
  players?: string;
  year?: string;
  status: LibraryStatus;
  coverUrl?: string;
};
export type Library = { source: string; name?: string; games: LibraryGame[]; skipped?: number; pending?: number; error?: string };
export type LibraryDownload = { status: LibraryStatus; pending?: boolean; warning?: string };

export const getLibrary = (e: Endpoint, refresh = false) => request<Library>(e, `/library${refresh ? '?refresh=true' : ''}`, { timeoutMs: 30000 });
// An empty address forgets the library
export const setLibrarySource = (e: Endpoint, url: string) => request<Library>(e, '/library/source', { method: 'PUT', body: { url }, timeoutMs: 30000 });
export const downloadFromLibrary = (e: Endpoint, file: string, overwrite = false) =>
  request<LibraryDownload>(e, '/library/download', { method: 'POST', body: { file, overwrite }, timeoutMs: 600000 });
export const libraryCoverPath = (file: string) => `/library/cover?file=${encodeURIComponent(file)}`;

// --- About ---------------------------------------------------------------------------------------

export type About = { version: string; platform: string; endpoints: { method: string; path: string }[] };
export const getAbout = (e: Endpoint) => request<About>(e, '/about');

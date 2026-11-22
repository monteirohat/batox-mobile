// Figures as the console screen shows them

export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return minutes > 0 ? `${minutes} min` : 'under a minute';
}

export function bytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = n;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

// "43.1 2026/05/30 04:34" -> "43.1"
export function shortVersion(version: string | undefined): string {
  return (version ?? '').split(' ')[0];
}

// A countdown: "25:13", "1:05:09"
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// A game's file name without its extension: "Golden Sun (USA).gba" -> "Golden Sun (USA)"
export function gameName(fileName: string): string {
  return fileName.replace(/\.[A-Za-z0-9]{1,5}$/, '');
}

// EmulationStation's dates: "20010801T000000" -> 2001
export function esYear(value: string | undefined): string | undefined {
  const m = /^(\d{4})/.exec(value ?? '');
  return m ? m[1] : undefined;
}

// EmulationStation's dates as a day: "20261122T204512" -> a local date
export function esDate(value: string | undefined): string | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(value ?? '');
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

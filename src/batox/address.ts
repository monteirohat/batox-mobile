// A console's address as people type it: "batocera.local", "192.168.0.10:8080",
// "http://192.168.0.10:8080/" or an IPv6 address.

export const DEFAULT_PORT = 8080;

export type Address = { host: string; port: number };

export function parseAddress(input: string): Address | null {
  const text = input.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!text) return null;
  const bracketed = /^\[([^\]]+)\](?::(\d+))?$/.exec(text);
  if (bracketed) return { host: bracketed[1], port: bracketed[2] ? Number(bracketed[2]) : DEFAULT_PORT };
  const parts = text.split(':');
  if (parts.length === 2) {
    if (!/^\d+$/.test(parts[1])) return null;
    const port = Number(parts[1]);
    return port > 0 && port < 65536 && parts[0] ? { host: parts[0], port } : null;
  }
  // More than one colon and no brackets: a bare IPv6 address
  return { host: text, port: DEFAULT_PORT };
}

// A host as it goes in a URL: IPv6 in brackets
export function urlHost(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

export function consoleUrl({ host, port }: Address): string {
  return `http://${urlHost(host)}:${port}/`;
}

// "batocera.local" on the default port, "192.168.0.10:9000" otherwise
export function displayAddress({ host, port }: Address): string {
  return port === DEFAULT_PORT ? host : `${urlHost(host)}:${port}`;
}

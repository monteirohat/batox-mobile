// The SSH client's socket on the phone, over the app's native TCP module (modules/batox-tcp).

import BatoxTcp from '../../modules/batox-tcp';
import { base64, fromBase64 } from './bytes';
import type { OpenSocket, SocketEvents } from './socket';

const listeners = new Map<string, SocketEvents>();
// Events that arrive before open() has returned the id to JavaScript
const early = new Map<string, { data: Uint8Array[]; closed?: { error?: string | null } }>();
let subscribed = false;

function subscribe() {
  if (subscribed) return;
  subscribed = true;
  BatoxTcp.addListener('onData', ({ id, data }) => {
    const bytes = fromBase64(data);
    const listener = listeners.get(id);
    if (listener) listener.onData(bytes);
    else earlyFor(id).data.push(bytes);
  });
  BatoxTcp.addListener('onClose', ({ id, error }) => {
    const listener = listeners.get(id);
    if (!listener) {
      earlyFor(id).closed = { error };
      return;
    }
    listeners.delete(id);
    listener.onClose(error ? new Error(error) : undefined);
  });
}

function earlyFor(id: string) {
  let entry = early.get(id);
  if (!entry) early.set(id, (entry = { data: [] }));
  return entry;
}

const MESSAGES: Record<string, (host: string, port: number, seconds: number) => string> = {
  ERR_REFUSED: (host, port) => `${host} refused the connection on port ${port}. Is SSH on? It is by default on Batocera.`,
  ERR_TIMEOUT: (host, _, seconds) => `${host} didn't answer within ${seconds} seconds. Check the address, and that the phone and the console are on the same network.`,
  ERR_HOST: (host) => `Couldn't find ${host} on the network. Try the console's IP address (Main menu > Network settings).`,
  ERR_NETWORK: (host) => `Couldn't reach ${host}. Check that the phone is on the same network as the console.`,
};

export const openNativeSocket: OpenSocket = async (host, port, events, timeoutMs) => {
  subscribe();
  let id: string;
  try {
    id = await BatoxTcp.open(host, port, timeoutMs);
  } catch (error) {
    const code = (error as { code?: string }).code ?? 'ERR_NETWORK';
    throw new Error((MESSAGES[code] ?? MESSAGES.ERR_NETWORK)(host, port, Math.round(timeoutMs / 1000)));
  }
  listeners.set(id, events);
  // Hand over what came early once the caller has the socket
  const pending = early.get(id);
  if (pending) {
    early.delete(id);
    setTimeout(() => {
      for (const data of pending.data) events.onData(data);
      if (pending.closed) {
        listeners.delete(id);
        events.onClose(pending.closed.error ? new Error(pending.closed.error) : undefined);
      }
    }, 0);
  }
  return {
    write: (data) => BatoxTcp.write(id, base64(data, true)),
    close: () => {
      listeners.delete(id);
      BatoxTcp.close(id);
    },
  };
};

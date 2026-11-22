/// <reference types="node" />
// The SSH client's socket over Node's net module, for tests and tools run on a computer.
// The app uses the native one instead (modules/batox-tcp).

import net from 'node:net';

import type { OpenSocket } from '../src/ssh/socket';

export const openNodeSocket: OpenSocket = (host, port, events, timeoutMs) =>
  new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Couldn't reach ${host}:${port} within ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.on('data', (data: Buffer) => events.onData(new Uint8Array(data)));
      socket.on('close', () => events.onClose());
      resolve({
        write: (data) => socket.write(data),
        close: () => socket.destroy(),
      });
    });
    socket.once('error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
      events.onClose(error);
    });
  });

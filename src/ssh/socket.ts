// What the SSH client needs from the network: a TCP connection that sends bytes, delivers the
// bytes it receives, and says when it ends. The app passes the native one (modules/batox-tcp);
// the tests pass Node's.

export interface Socket {
  write(data: Uint8Array): void;
  close(): void;
}

export type SocketEvents = {
  onData: (data: Uint8Array) => void;
  onClose: (error?: Error) => void;
};

export type OpenSocket = (host: string, port: number, events: SocketEvents, timeoutMs: number) => Promise<Socket>;

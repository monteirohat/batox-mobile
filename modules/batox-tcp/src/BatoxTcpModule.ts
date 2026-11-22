import { NativeModule, requireNativeModule } from 'expo';

import type { BatoxTcpModuleEvents } from './BatoxTcp.types';

declare class BatoxTcpModule extends NativeModule<BatoxTcpModuleEvents> {
  // Connects; resolves with the connection's id. Rejects with the code ERR_REFUSED, ERR_TIMEOUT,
  // ERR_HOST or ERR_NETWORK.
  open(host: string, port: number, timeoutMs: number): Promise<string>;
  // Sends bytes (base64), in call order
  write(id: string, data: string): void;
  // Closes a connection; no onClose event follows
  close(id: string): void;
}

export default requireNativeModule<BatoxTcpModule>('BatoxTcp');

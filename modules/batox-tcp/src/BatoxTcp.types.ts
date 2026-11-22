export type BatoxTcpModuleEvents = {
  // Bytes received on a connection, as base64
  onData: (event: { id: string; data: string }) => void;
  // A connection ended by itself or failed (not when closed from JavaScript)
  onClose: (event: { id: string; error?: string | null }) => void;
};

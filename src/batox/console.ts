// Looking at a Batocera console over SSH: the same checks as the BatoX Installer
// (BatoX_Installer src/main/installer.ts), so both tell the same story.

import { SshClient } from '../ssh/client';
import type { OpenSocket } from '../ssh/socket';

export const APP_DIR = '/userdata/system/batox';
const LEGACY_DIR = '/userdata/system/mymine';
const LEGACY_SERVICE = '/userdata/system/services/mymine';

export type Target = {
  host: string;
  port?: number;
  username: string;
  password: string;
};

export type ConsoleInfo = {
  host: string;
  batoceraVersion: string;
  model: string;
  arch: 'arm64' | 'amd64';
  installedVersion: string | null;
  hasMyMine: boolean;
  hostKey: string;
};

// Prints key=value lines describing the console
const INSPECT_SCRIPT = [
  'echo "batocera=$(test -d /userdata/system && echo yes || echo no)"',
  'echo "version=$(head -n 1 /usr/share/batocera/batocera.version 2>/dev/null)"',
  'echo "arch=$(uname -m)"',
  'echo "services=$(command -v batocera-services >/dev/null 2>&1 && echo yes || echo no)"',
  `echo "installed=$([ -x ${APP_DIR}/batox ] && ${APP_DIR}/batox -version 2>/dev/null)"`,
  `echo "legacy=$([ -d ${LEGACY_DIR} ] || [ -e ${LEGACY_SERVICE} ] && echo yes || echo no)"`,
  `echo "model=$(tr -d '\\0' 2>/dev/null < /proc/device-tree/model)"`,
].join('\n');

function parseKeyValues(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

// Opens an SSH session to the console. With expectedHostKey, refuses a console whose host key
// changed since it was checked.
export async function connect(target: Target, openSocket: OpenSocket, expectedHostKey?: string): Promise<SshClient> {
  return SshClient.connect({
    host: target.host.trim(),
    port: target.port ?? 22,
    username: target.username.trim(),
    password: target.password,
    openSocket,
    checkHostKey: expectedHostKey ? (fingerprint) => fingerprint === expectedHostKey : undefined,
  });
}

// Checks that the console can run BatoX
export async function inspect(ssh: SshClient, host: string): Promise<ConsoleInfo> {
  const { stdout } = await ssh.exec(INSPECT_SCRIPT);
  const kv = parseKeyValues(stdout);
  if (kv.batocera !== 'yes') {
    throw new Error("This machine doesn't look like Batocera: the /userdata/system folder was not found.");
  }
  if (kv.services !== 'yes') {
    throw new Error('BatoX needs Batocera v38 or newer (the batocera-services command was not found).');
  }
  const arch = kv.arch === 'aarch64' || kv.arch === 'arm64' ? 'arm64' : kv.arch === 'x86_64' ? 'amd64' : null;
  if (!arch) {
    throw new Error(`Unsupported processor (${kv.arch || 'unknown'}). BatoX runs on 64-bit ARM boards, such as the Raspberry Pi 4 and 5, and on x86_64 PCs.`);
  }
  return {
    host,
    batoceraVersion: kv.version || 'unknown',
    model: kv.model || '',
    arch,
    installedVersion: kv.installed || null,
    hasMyMine: kv.legacy === 'yes',
    hostKey: ssh.hostKeyFingerprint,
  };
}

// Connects, looks, and disconnects
export async function inspectConsole(target: Target, openSocket: OpenSocket): Promise<ConsoleInfo> {
  const ssh = await connect(target, openSocket);
  try {
    return await inspect(ssh, target.host.trim());
  } finally {
    ssh.close();
  }
}

/// <reference types="node" />
// Runs the app's SSH client against a real console, from a computer:
//
//   CONSOLE=192.168.0.10 npx tsx tools/ssh-smoke.ts            (password: SSH_PASSWORD, default linux)
//
// It signs in, prints the host key fingerprint, runs a few commands (one writes to stderr and
// exits with 3) and a larger output, then disconnects.

import { SshClient } from '../src/ssh/client';
import { openNodeSocket } from './node-socket';

const host = process.env.CONSOLE ?? 'batocera.local';

async function main() {
  const started = Date.now();
  const ssh = await SshClient.connect({
    host,
    username: process.env.SSH_USER ?? 'root',
    password: process.env.SSH_PASSWORD ?? 'linux',
    openSocket: openNodeSocket,
  });
  console.log(`connected in ${Date.now() - started} ms, host key ${ssh.hostKeyFingerprint}`);

  const info = await ssh.exec('uname -m; cat /usr/share/batocera/batocera.version; which curl sha256sum');
  console.log('info:', JSON.stringify(info));

  const failing = await ssh.exec('echo to-stdout; echo to-stderr >&2; exit 3');
  console.log('failing:', JSON.stringify(failing));

  const t = Date.now();
  const big = await ssh.exec('head -c 3000000 /dev/zero | base64');
  console.log(`large output: ${big.stdout.length} chars in ${Date.now() - t} ms, code ${big.code}`);

  const parallel = await Promise.all([ssh.exec('echo one'), ssh.exec('echo two'), ssh.exec('sleep 1; echo three')]);
  console.log('parallel:', parallel.map((r) => r.stdout.trim()).join(' '));

  ssh.close();
}

main().catch((error) => {
  console.error('failed:', error.kind ?? '', error.message);
  process.exit(1);
});

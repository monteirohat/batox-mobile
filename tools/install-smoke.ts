/// <reference types="node" />
// Installs BatoX on a real console with the app's install steps, from a computer:
//
//   CONSOLE=192.168.0.10 npx tsx tools/install-smoke.ts [tag]      (default: the latest release)
//
// It reinstalls or updates BatoX on that console: the token, settings and catalog are kept.

import { inspectConsole } from '../src/batox/console';
import { listReleases } from '../src/batox/github';
import { STEPS, install } from '../src/batox/install';
import { openNodeSocket } from './node-socket';

async function main() {
  const target = { host: process.env.CONSOLE ?? 'batocera.local', username: process.env.SSH_USER ?? 'root', password: process.env.SSH_PASSWORD ?? 'linux' };
  const releases = await listReleases();
  const release = process.argv[2] ? releases.find((r) => r.tag === process.argv[2]) : releases.find((r) => !r.prerelease);
  if (!release) throw new Error('Release not found');
  const info = await inspectConsole(target, openNodeSocket);
  console.log(`console: ${info.model}, Batocera ${info.batoceraVersion}, BatoX ${info.installedVersion ?? 'none'}; installing ${release.tag}`);

  const started = Date.now();
  let lastPercent = -1;
  const result = await install({
    target,
    release,
    openSocket: openNodeSocket,
    hostKey: info.hostKey,
    report: (p) => {
      if (p.percent !== undefined) {
        if (p.percent - lastPercent >= 20) console.log(`  download ${p.percent}%`);
        lastPercent = p.percent;
        return;
      }
      const label = STEPS.find((s) => s.id === p.step)?.label;
      console.log(`  ${p.state.padEnd(7)} ${label}${p.detail ? ` (${p.detail})` : ''}  +${((Date.now() - started) / 1000).toFixed(1)}s`);
    },
  });
  console.log(`done: ${result.url} version ${result.version} (was ${result.updatedFrom}), token ${result.token ? result.token.slice(0, 6) + '…' : 'none'}`);
}

main().catch((error) => {
  console.error('failed:', error.message);
  process.exit(1);
});

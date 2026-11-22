// Installs or updates BatoX on a console over SSH: the BatoX Installer's steps
// (BatoX_Installer src/main/installer.ts), except that the console downloads the release from
// GitHub itself, so nothing large crosses the phone.

import type { SshClient } from '../ssh/client';
import type { OpenSocket } from '../ssh/socket';
import { APP_DIR, connect, inspect, type ConsoleInfo, type Target } from './console';
import type { Release } from './github';

const SERVICE_DIR = '/userdata/system/services';
const SERVICE = `${SERVICE_DIR}/batox`;
const LEGACY_DIR = '/userdata/system/mymine';
const LEGACY_SERVICE = `${SERVICE_DIR}/mymine`;
// Outside APP_DIR, so the MyMine move below still finds no BatoX folder
const DOWNLOAD_DIR = '/userdata/system/batox-download';
const DEFAULT_PORT = 8080;

export type StepId = 'connect' | 'inspect' | 'download' | 'verify' | 'migrate' | 'install' | 'start' | 'check';
export type StepState = 'pending' | 'active' | 'done' | 'skipped' | 'error';

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'connect', label: 'Connect to the console' },
  { id: 'inspect', label: 'Check the console' },
  { id: 'download', label: 'Download BatoX' },
  { id: 'verify', label: 'Verify the files' },
  { id: 'migrate', label: 'Move MyMine to BatoX' },
  { id: 'install', label: 'Install the service' },
  { id: 'start', label: 'Start BatoX' },
  { id: 'check', label: 'Check that BatoX answers' },
];

export type Progress = { step: StepId; state: StepState; detail?: string; percent?: number };

export type InstallResult = {
  url: string;
  host: string;
  port: number;
  token: string | null;
  version: string;
  console: ConsoleInfo;
  updatedFrom: string | null;
};

export type InstallOptions = {
  target: Target;
  release: Release;
  openSocket: OpenSocket;
  // The host key seen when the console was checked: a different one stops the install
  hostKey?: string;
  signal?: AbortSignal;
  report: (progress: Progress) => void;
};

// Moves a MyMine install (BatoX's former name) to BatoX, keeping its data
const MIGRATE_SCRIPT = `
batocera-services stop mymine >/dev/null 2>&1 || true
batocera-services disable mymine >/dev/null 2>&1 || true
rm -f ${LEGACY_SERVICE}
if [ -d ${LEGACY_DIR} ] && [ ! -e ${APP_DIR} ]; then
  mv ${LEGACY_DIR} ${APP_DIR}
  [ -f ${APP_DIR}/mymine.db ] && mv ${APP_DIR}/mymine.db ${APP_DIR}/batox.db
  rm -f ${APP_DIR}/mymine
fi
exit 0
`;

// A shell word in single quotes
function quote(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

export function parseChecksums(text: string): Map<string, string> {
  const sums = new Map<string, string>();
  for (const line of text.split('\n')) {
    const m = /^([a-f0-9]{64})\s+\*?(.+)$/i.exec(line.trim());
    if (m) sums.set(m[2].trim(), m[1].toLowerCase());
  }
  return sums;
}

function urlHost(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// What curl's exit code means for someone holding a phone
function downloadError(code: number | null, stderr: string): string {
  const reason =
    code === 6 ? "it couldn't look up github.com"
    : code === 7 ? "it couldn't connect to GitHub"
    : code === 28 ? 'the download timed out'
    : code === 35 || code === 60 ? 'the secure connection to GitHub failed (check the console\'s date and time)'
    : code === 23 ? 'it ran out of space while saving the files'
    : stderr.trim() || `curl exit code ${code}`;
  return `The console couldn't download BatoX: ${reason}. It needs an internet connection of its own.`;
}

export async function install(options: InstallOptions): Promise<InstallResult> {
  const { target, release, report, signal } = options;
  const host = target.host.trim();
  let current: StepId = 'connect';
  let ssh: SshClient | undefined;

  const begin = (step: StepId, detail?: string) => {
    current = step;
    report({ step, state: 'active', detail });
  };
  const done = (step: StepId, detail?: string) => report({ step, state: 'done', detail });
  const skip = (step: StepId, detail?: string) => report({ step, state: 'skipped', detail });
  const checkCancel = () => {
    if (signal?.aborted) throw new Error('Installation cancelled.');
  };
  const onAbort = () => ssh?.close();
  signal?.addEventListener('abort', onAbort);

  try {
    begin('connect', host);
    try {
      ssh = await connect(target, options.openSocket, options.hostKey);
    } catch (error) {
      if (options.hostKey && error instanceof Error && 'kind' in error && error.kind === 'hostkey') {
        throw new Error("The console's SSH host key changed since it was checked. Check the console again.");
      }
      throw error;
    }
    checkCancel();
    done('connect', host);

    begin('inspect');
    const info = await inspect(ssh, host);
    checkCancel();
    done('inspect', `Batocera ${info.batoceraVersion.split(' ')[0]}, ${info.arch}`);

    // The console downloads the release's files for its processor
    begin('download', release.tag);
    const names = { binary: `batox-linux-${info.arch}`, service: 'batox', config: 'config.example.json', sums: 'SHA256SUMS' };
    const find = (name: string) => release.assets.find((a) => a.name === name);
    const binary = find(names.binary);
    const service = find(names.service);
    if (!binary || !service) {
      throw new Error(`Release ${release.tag} doesn't include the files for this console (${names.binary} and ${names.service}).`);
    }
    const assets = [binary, service, find(names.config), find(names.sums)].filter((a) => a !== undefined);
    const total = assets.reduce((n, a) => n + a.size, 0) || 1;
    const script = [
      `rm -rf ${DOWNLOAD_DIR} && mkdir -p ${DOWNLOAD_DIR} && cd ${DOWNLOAD_DIR} || exit 23`,
      ...assets.map((a) => `curl -fsSL --retry 2 --connect-timeout 20 -o ${quote(a.name)} ${quote(a.url)} || exit $?`),
    ].join('\n');
    let finished = false;
    const downloading = ssh.exec(script, { timeoutMs: 15 * 60_000 }).finally(() => {
      finished = true;
    });
    // Meanwhile, another channel reads how much has arrived
    while (!finished) {
      await Promise.race([downloading.catch(() => undefined), sleep(800)]);
      if (finished) break;
      const size = await ssh.exec(`du -sb ${DOWNLOAD_DIR} 2>/dev/null | cut -f1`).catch(() => undefined);
      const bytes = Number(size?.stdout.trim()) || 0;
      if (!finished) report({ step: 'download', state: 'active', detail: release.tag, percent: Math.min(99, Math.round((bytes / total) * 100)) });
    }
    const download = await downloading;
    checkCancel();
    if (download.code !== 0) throw new Error(downloadError(download.code, download.stderr));
    done('download', release.tag);

    if (find(names.sums)) {
      begin('verify');
      const files = [names.binary, names.service, ...(find(names.config) ? [names.config] : [])];
      const sums = await ssh.exec(`cd ${DOWNLOAD_DIR} && cat ${names.sums} && echo --- && sha256sum ${files.join(' ')}`);
      const [expectedText, actualText = ''] = sums.stdout.split('\n---\n');
      const expected = parseChecksums(expectedText);
      const actual = parseChecksums(actualText);
      for (const file of files) {
        const want = expected.get(file);
        if (want && actual.get(file) !== want) {
          throw new Error(`${file} arrived corrupted (its checksum doesn't match). Try again.`);
        }
      }
      done('verify');
    } else {
      skip('verify', 'This release has no checksums');
    }
    checkCancel();

    if (info.hasMyMine) {
      begin('migrate');
      await ssh.exec(MIGRATE_SCRIPT);
      done('migrate');
    } else {
      skip('migrate');
    }
    checkCancel();

    // Put the files in place, keeping an existing config.json
    begin('install');
    const placed = await ssh.exec(
      [
        'batocera-services stop batox >/dev/null 2>&1 || true',
        `mkdir -p ${APP_DIR} ${SERVICE_DIR}`,
        `mv ${DOWNLOAD_DIR}/${names.binary} ${APP_DIR}/batox.new`,
        `mv ${DOWNLOAD_DIR}/${names.service} ${SERVICE}`,
        `if [ ! -f ${APP_DIR}/config.json ] && [ -f ${DOWNLOAD_DIR}/${names.config} ]; then mv ${DOWNLOAD_DIR}/${names.config} ${APP_DIR}/config.json && chmod 644 ${APP_DIR}/config.json; fi`,
        `chmod 755 ${APP_DIR}/batox.new ${SERVICE}`,
      ].join(' && '),
    );
    if (placed.code !== 0) throw new Error(`Couldn't put BatoX in place: ${(placed.stderr || placed.stdout).trim() || `exit code ${placed.code}`}`);
    checkCancel();
    done('install');

    begin('start');
    const started = await ssh.exec(
      `mv ${APP_DIR}/batox.new ${APP_DIR}/batox && chmod +x ${APP_DIR}/batox ${SERVICE} && ` +
        `sed -i 's/\\r$//' ${SERVICE} && batocera-services enable batox && batocera-services start batox`,
    );
    if (started.code !== 0) {
      throw new Error(`The BatoX service did not start: ${(started.stderr || started.stdout).trim() || `exit code ${started.code}`}`);
    }
    done('start');

    begin('check');
    const port = await readPort(ssh);
    const ping = await ssh.exec(`for i in $(seq 1 15); do curl -fsS http://127.0.0.1:${port}/api/v1/ping >/dev/null 2>&1 && exit 0; sleep 1; done; exit 1`, {
      timeoutMs: 60_000,
    });
    if (ping.code !== 0) throw new Error(`BatoX was installed but is not answering on port ${port}. Its logs are in ${APP_DIR}/logs on the console.`);
    const token = (await ssh.exec(`cat ${APP_DIR}/token 2>/dev/null`)).stdout.trim() || null;
    await ssh.exec(`rm -rf ${DOWNLOAD_DIR}`).catch(() => undefined);
    done('check');

    return { url: `http://${urlHost(host)}:${port}/`, host, port, token, version: release.tag, console: info, updatedFrom: info.installedVersion };
  } catch (error) {
    const message = signal?.aborted ? 'Installation cancelled.' : error instanceof Error ? error.message : String(error);
    report({ step: current, state: 'error', detail: message });
    throw new Error(message);
  } finally {
    signal?.removeEventListener('abort', onAbort);
    ssh?.close();
  }
}

// The port BatoX listens on, from its config.json (":8080" by default)
async function readPort(ssh: SshClient): Promise<number> {
  const { stdout } = await ssh.exec(`cat ${APP_DIR}/config.json 2>/dev/null`);
  try {
    const m = /:(\d+)$/.exec(String(JSON.parse(stdout).listen ?? ''));
    if (m) return Number(m[1]);
  } catch {
    // No config or no "listen": the default applies
  }
  return DEFAULT_PORT;
}

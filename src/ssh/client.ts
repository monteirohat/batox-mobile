// A small SSH client: just what installing BatoX needs. It connects, checks the server's host
// key, signs in with a password, and runs commands, each in its own channel, returning their
// output and exit code. No shell, no port forwarding, no file transfer: the console downloads
// BatoX itself.
//
// Protocol: RFC 4253 (transport), RFC 4252 (authentication), RFC 4254 (connection), with the
// algorithms listed in ./crypto. Re-keying isn't supported; the connections are short.

import { Reader, Writer, concat, utf8Decode, utf8Encode } from './bytes';
import {
  BLOCK,
  CIPHERS,
  CtrStream,
  HOST_KEYS,
  KEX,
  MACS,
  MAC_LENGTH,
  deriveKey,
  fingerprint,
  keyLength,
  mac,
  randomBytes,
  sameBytes,
  sha256,
  verifyHostSignature,
  x25519Pair,
  x25519Shared,
} from './crypto';
import type { OpenSocket, Socket } from './socket';

const MSG = {
  DISCONNECT: 1,
  IGNORE: 2,
  UNIMPLEMENTED: 3,
  DEBUG: 4,
  SERVICE_REQUEST: 5,
  SERVICE_ACCEPT: 6,
  EXT_INFO: 7,
  KEXINIT: 20,
  NEWKEYS: 21,
  KEX_ECDH_INIT: 30,
  KEX_ECDH_REPLY: 31,
  USERAUTH_REQUEST: 50,
  USERAUTH_FAILURE: 51,
  USERAUTH_SUCCESS: 52,
  USERAUTH_BANNER: 53,
  USERAUTH_INFO_REQUEST: 60,
  USERAUTH_INFO_RESPONSE: 61,
  GLOBAL_REQUEST: 80,
  REQUEST_FAILURE: 82,
  CHANNEL_OPEN: 90,
  CHANNEL_OPEN_CONFIRMATION: 91,
  CHANNEL_OPEN_FAILURE: 92,
  CHANNEL_WINDOW_ADJUST: 93,
  CHANNEL_DATA: 94,
  CHANNEL_EXTENDED_DATA: 95,
  CHANNEL_EOF: 96,
  CHANNEL_CLOSE: 97,
  CHANNEL_REQUEST: 98,
  CHANNEL_SUCCESS: 99,
  CHANNEL_FAILURE: 100,
} as const;

const CLIENT_VERSION = 'SSH-2.0-BatoX_Mobile';
const STRICT_CLIENT = 'kex-strict-c-v00@openssh.com';
const STRICT_SERVER = 'kex-strict-s-v00@openssh.com';
const MAX_PACKET = 256 * 1024;
const WINDOW = 2 * 1024 * 1024;
const CHANNEL_MAX_PACKET = 32 * 1024;

export type SshErrorKind = 'network' | 'timeout' | 'auth' | 'hostkey' | 'protocol';

export class SshError extends Error {
  constructor(
    message: string,
    readonly kind: SshErrorKind,
  ) {
    super(message);
    this.name = 'SshError';
  }
}

export type ConnectOptions = {
  host: string;
  port?: number;
  username: string;
  password: string;
  openSocket: OpenSocket;
  // Connecting, key exchange and sign-in together
  timeoutMs?: number;
  // Decides whether to trust the server's host key, from its SHA256 fingerprint
  checkHostKey?: (fingerprint: string) => boolean | Promise<boolean>;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  // The exit status, or null when the command ended without one (killed by a signal)
  code: number | null;
  signal?: string;
};

type Channel = {
  remoteId: number;
  remoteWindow: number;
  stdout: Uint8Array[];
  stderr: Uint8Array[];
  unacknowledged: number;
  code: number | null;
  signal?: string;
  closedByUs: boolean;
  opened: Deferred<void>;
  requested: Deferred<void>;
  closed: Deferred<void>;
};

class Deferred<T> {
  promise: Promise<T>;
  resolve!: (value: T) => void;
  reject!: (error: Error) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    // A rejection nobody waits for yet mustn't be reported as unhandled
    this.promise.catch(() => {});
  }
}

export class SshClient {
  private socket!: Socket;
  private inbox: Uint8Array = new Uint8Array(0);
  private serverVersion = new Deferred<string>();
  private versionSeen = false;
  private queue: Uint8Array[] = [];
  private waiters: Deferred<Uint8Array>[] = [];
  private failure?: Error;

  private sendSequence = 0;
  private receiveSequence = 0;
  private encrypt?: { stream: CtrStream; macKey: Uint8Array };
  private decrypt?: { stream: CtrStream; macKey: Uint8Array };
  private nextDecrypt?: { stream: CtrStream; macKey: Uint8Array };
  private firstBlock?: Uint8Array;
  private holdAfterNewKeys = false;
  private strictKex = false;

  private channels = new Map<number, Channel>();
  private nextChannelId = 0;

  // The server's host key, as `ssh-keygen -l` prints it
  hostKeyFingerprint = '';

  private constructor() {}

  static async connect(options: ConnectOptions): Promise<SshClient> {
    const client = new SshClient();
    const timeoutMs = options.timeoutMs ?? 20000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new SshError(`The console didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`, 'timeout')), timeoutMs);
    });
    try {
      const handshake = client.handshake(options, timeoutMs);
      handshake.catch(() => {});
      await Promise.race([handshake, timeout]);
      return client;
    } catch (error) {
      client.close();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  // Runs one command and waits for it to end
  async exec(command: string, options: { timeoutMs?: number } = {}): Promise<ExecResult> {
    this.throwIfFailed();
    const localId = this.nextChannelId++;
    const channel: Channel = {
      remoteId: -1,
      remoteWindow: 0,
      stdout: [],
      stderr: [],
      unacknowledged: 0,
      code: null,
      closedByUs: false,
      opened: new Deferred(),
      requested: new Deferred(),
      closed: new Deferred(),
    };
    this.channels.set(localId, channel);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutMs = options.timeoutMs ?? 120000;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new SshError(`The command didn't finish within ${Math.round(timeoutMs / 1000)} seconds.`, 'timeout')), timeoutMs);
    });

    try {
      const run = async () => {
        this.send(new Writer().byte(MSG.CHANNEL_OPEN).string('session').uint32(localId).uint32(WINDOW).uint32(CHANNEL_MAX_PACKET).bytes());
        await channel.opened.promise;
        this.send(new Writer().byte(MSG.CHANNEL_REQUEST).uint32(channel.remoteId).string('exec').bool(true).string(command).bytes());
        await channel.requested.promise;
        // Nothing to send on stdin: say so, so a command that reads it doesn't wait
        this.send(new Writer().byte(MSG.CHANNEL_EOF).uint32(channel.remoteId).bytes());
        await channel.closed.promise;
      };
      const running = run();
      running.catch(() => {});
      await Promise.race([running, timeout]);
      return {
        stdout: utf8Decode(concat(...channel.stdout)),
        stderr: utf8Decode(concat(...channel.stderr)),
        code: channel.code,
        signal: channel.signal,
      };
    } catch (error) {
      if (channel.remoteId >= 0 && !channel.closedByUs && !this.failure) {
        channel.closedByUs = true;
        this.send(new Writer().byte(MSG.CHANNEL_CLOSE).uint32(channel.remoteId).bytes());
      }
      throw error;
    } finally {
      clearTimeout(timer);
      this.channels.delete(localId);
    }
  }

  close(): void {
    if (!this.failure && this.encrypt) {
      try {
        this.send(new Writer().byte(MSG.DISCONNECT).uint32(11).string('bye').string('').bytes());
      } catch {
        // already gone
      }
    }
    this.fail(new SshError('The connection is closed.', 'network'));
    this.socket?.close();
  }

  // --- handshake -------------------------------------------------------------------------------

  private async handshake(options: ConnectOptions, timeoutMs: number): Promise<void> {
    this.socket = await options.openSocket(options.host, options.port ?? 22, {
      onData: (data) => this.receive(data),
      onClose: (error) => this.fail(error ? new SshError(error.message, 'network') : new SshError('The console closed the connection.', 'network')),
    }, timeoutMs);

    this.socket.write(utf8Encode(CLIENT_VERSION + '\r\n'));
    const serverVersion = await this.serverVersion.promise;
    if (!serverVersion.startsWith('SSH-2.0-') && !serverVersion.startsWith('SSH-1.99-')) {
      throw new SshError(`This SSH server is too old (${serverVersion}).`, 'protocol');
    }

    // Algorithm negotiation (RFC 4253, section 7.1)
    const clientKexInit = new Writer()
      .byte(MSG.KEXINIT)
      .raw(randomBytes(16))
      .nameList([...KEX, STRICT_CLIENT])
      .nameList(HOST_KEYS)
      .nameList(CIPHERS)
      .nameList(CIPHERS)
      .nameList(MACS)
      .nameList(MACS)
      .nameList(['none'])
      .nameList(['none'])
      .nameList([])
      .nameList([])
      .bool(false)
      .uint32(0)
      .bytes();
    this.send(clientKexInit);

    const serverKexInit = await this.read({ first: true });
    if (serverKexInit[0] !== MSG.KEXINIT) throw this.unexpected(serverKexInit, 'the key exchange');
    const r = new Reader(serverKexInit);
    r.byte();
    r.raw(16);
    const server = {
      kex: r.nameList(),
      hostKeys: r.nameList(),
      ciphersOut: r.nameList(),
      ciphersIn: r.nameList(),
      macsOut: r.nameList(),
      macsIn: r.nameList(),
      compressionOut: r.nameList(),
      compressionIn: r.nameList(),
    };
    r.nameList();
    r.nameList();
    const guessFollows = r.bool();

    const pick = (ours: string[], theirs: string[], what: string) => {
      const found = ours.find((name) => theirs.includes(name));
      if (!found) throw new SshError(`The console's SSH server offers no ${what} this app supports (it offers ${theirs.join(', ') || 'none'}).`, 'protocol');
      return found;
    };
    const kex = pick(KEX, server.kex, 'key exchange');
    const hostKeyType = pick(HOST_KEYS, server.hostKeys, 'host key type');
    const cipherOut = pick(CIPHERS, server.ciphersOut, 'cipher');
    const cipherIn = pick(CIPHERS, server.ciphersIn, 'cipher');
    pick(MACS, server.macsOut, 'integrity check');
    pick(MACS, server.macsIn, 'integrity check');
    pick(['none'], server.compressionOut, 'compression setting');
    pick(['none'], server.compressionIn, 'compression setting');
    this.strictKex = server.kex.includes(STRICT_SERVER);
    // The server guessed its own key exchange packet: drop it unless the guess was ours
    if (guessFollows && (server.kex[0] !== kex || server.hostKeys[0] !== hostKeyType)) await this.read();

    // curve25519-sha256 (RFC 8731)
    const ours = x25519Pair();
    this.send(new Writer().byte(MSG.KEX_ECDH_INIT).string(ours.publicKey).bytes());
    const reply = await this.read();
    if (reply[0] !== MSG.KEX_ECDH_REPLY) throw this.unexpected(reply, 'the key exchange');
    const rr = new Reader(reply);
    rr.byte();
    const hostKey = rr.string();
    const theirs = rr.string();
    const signature = rr.string();
    const shared = x25519Shared(ours.secret, theirs);
    const exchangeHash = sha256(
      new Writer()
        .string(CLIENT_VERSION)
        .string(serverVersion)
        .string(clientKexInit)
        .string(serverKexInit)
        .string(hostKey)
        .string(ours.publicKey)
        .string(theirs)
        .mpint(shared)
        .bytes(),
    );

    if (new Reader(hostKey).text() !== hostKeyType || !verifyHostSignature(hostKey, signature, exchangeHash)) {
      throw new SshError("The console's SSH host key doesn't match its signature. Something between this phone and the console may be interfering.", 'hostkey');
    }
    this.hostKeyFingerprint = fingerprint(hostKey);
    if (options.checkHostKey && !(await options.checkHostKey(this.hostKeyFingerprint))) {
      throw new SshError(`The console's SSH host key (${this.hostKeyFingerprint}) wasn't trusted.`, 'hostkey');
    }

    // New keys (RFC 4253, section 7.2); the first exchange hash is the session id
    const id = exchangeHash;
    const derive = (letter: string, length: number) => deriveKey(shared, exchangeHash, letter, id, length);
    this.nextDecrypt = { stream: new CtrStream(derive('D', keyLength(cipherIn)), derive('B', BLOCK)), macKey: derive('F', 32) };
    this.send(Uint8Array.of(MSG.NEWKEYS));
    this.encrypt = { stream: new CtrStream(derive('C', keyLength(cipherOut)), derive('A', BLOCK)), macKey: derive('E', 32) };
    if (this.strictKex) this.sendSequence = 0;

    const newKeys = await this.read();
    if (newKeys[0] !== MSG.NEWKEYS) throw this.unexpected(newKeys, 'the key exchange');
    this.decrypt = this.nextDecrypt;
    this.nextDecrypt = undefined;
    this.holdAfterNewKeys = false;
    this.parse();

    // Authentication (RFC 4252)
    this.send(new Writer().byte(MSG.SERVICE_REQUEST).string('ssh-userauth').bytes());
    const accept = await this.read();
    if (accept[0] !== MSG.SERVICE_ACCEPT) throw this.unexpected(accept, 'sign-in');
    await this.authenticate(options.username, options.password);
    void this.dispatch();
  }

  private async authenticate(username: string, password: string): Promise<void> {
    const request = (method: string) => new Writer().byte(MSG.USERAUTH_REQUEST).string(username).string('ssh-connection').string(method);
    this.send(request('password').bool(false).string(password).bytes());
    let triedKeyboard = false;
    for (;;) {
      const message = await this.read();
      switch (message[0]) {
        case MSG.USERAUTH_SUCCESS:
          return;
        case MSG.USERAUTH_BANNER:
          continue;
        case MSG.USERAUTH_FAILURE: {
          const methods = new Reader(message.subarray(1)).nameList();
          // Some servers take the password through keyboard-interactive (RFC 4256) only
          if (!triedKeyboard && methods.includes('keyboard-interactive')) {
            triedKeyboard = true;
            this.send(request('keyboard-interactive').string('').string('').bytes());
            continue;
          }
          throw new SshError(
            methods.includes('password') || triedKeyboard
              ? "The user name or password is wrong. Batocera's default login is root / linux."
              : `The console doesn't accept a password for SSH (it accepts ${methods.join(', ') || 'nothing'}).`,
            'auth',
          );
        }
        case MSG.USERAUTH_INFO_REQUEST: {
          const r = new Reader(message.subarray(1));
          r.text();
          r.text();
          r.text();
          const prompts = r.uint32();
          const answer = new Writer().byte(MSG.USERAUTH_INFO_RESPONSE).uint32(prompts);
          for (let i = 0; i < prompts; i++) answer.string(password);
          this.send(answer.bytes());
          continue;
        }
        default:
          throw this.unexpected(message, 'sign-in');
      }
    }
  }

  // --- connection layer ------------------------------------------------------------------------

  private async dispatch(): Promise<void> {
    try {
      for (;;) {
        const message = await this.read();
        const r = new Reader(message);
        const type = r.byte();
        if (type === MSG.GLOBAL_REQUEST) {
          r.text();
          if (r.bool()) this.send(Uint8Array.of(MSG.REQUEST_FAILURE));
          continue;
        }
        if (type === MSG.KEXINIT) throw new SshError('The console asked to renew the encryption keys, which this app does not support.', 'protocol');
        if (type < MSG.CHANNEL_OPEN_CONFIRMATION || type > MSG.CHANNEL_FAILURE) continue;
        const channel = this.channels.get(r.uint32());
        if (!channel) continue;
        this.onChannelMessage(type, r, channel);
      }
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private onChannelMessage(type: number, r: Reader, channel: Channel): void {
    switch (type) {
      case MSG.CHANNEL_OPEN_CONFIRMATION:
        channel.remoteId = r.uint32();
        channel.remoteWindow = r.uint32();
        channel.opened.resolve();
        break;
      case MSG.CHANNEL_OPEN_FAILURE: {
        r.uint32();
        const reason = r.text();
        channel.opened.reject(new SshError(`The console refused to run a command${reason ? `: ${reason}` : '.'}`, 'protocol'));
        break;
      }
      case MSG.CHANNEL_SUCCESS:
        channel.requested.resolve();
        break;
      case MSG.CHANNEL_FAILURE:
        channel.requested.reject(new SshError('The console refused to run the command.', 'protocol'));
        break;
      case MSG.CHANNEL_WINDOW_ADJUST:
        channel.remoteWindow += r.uint32();
        break;
      case MSG.CHANNEL_DATA:
      case MSG.CHANNEL_EXTENDED_DATA: {
        const stream = type === MSG.CHANNEL_EXTENDED_DATA && r.uint32() === 1 ? channel.stderr : channel.stdout;
        const data = r.string();
        stream.push(data.slice());
        // Give the window back once half of it is used
        channel.unacknowledged += data.length;
        if (channel.unacknowledged >= WINDOW / 2) {
          this.send(new Writer().byte(MSG.CHANNEL_WINDOW_ADJUST).uint32(channel.remoteId).uint32(channel.unacknowledged).bytes());
          channel.unacknowledged = 0;
        }
        break;
      }
      case MSG.CHANNEL_REQUEST: {
        const name = r.text();
        const wantReply = r.bool();
        if (name === 'exit-status') channel.code = r.uint32();
        else if (name === 'exit-signal') channel.signal = r.text();
        if (wantReply) this.send(new Writer().byte(MSG.CHANNEL_FAILURE).uint32(channel.remoteId).bytes());
        break;
      }
      case MSG.CHANNEL_CLOSE:
        if (!channel.closedByUs) {
          channel.closedByUs = true;
          this.send(new Writer().byte(MSG.CHANNEL_CLOSE).uint32(channel.remoteId).bytes());
        }
        channel.closed.resolve();
        break;
    }
  }

  // --- packets ---------------------------------------------------------------------------------

  // The next message that matters: skips IGNORE and DEBUG, and turns DISCONNECT into an error.
  // During the first key exchange of a strict server (Terrapin, CVE-2023-48795) nothing may come
  // before KEXINIT.
  private async read({ first = false } = {}): Promise<Uint8Array> {
    for (;;) {
      const message = await this.nextPacket();
      const type = message[0];
      if (type === MSG.DISCONNECT) {
        const r = new Reader(message);
        r.byte();
        r.uint32();
        const why = r.text();
        throw new SshError(`The console ended the connection${why ? `: ${why}` : '.'}`, 'network');
      }
      if (first && type !== MSG.KEXINIT) continue;
      if (type === MSG.IGNORE || type === MSG.DEBUG || type === MSG.UNIMPLEMENTED || type === MSG.EXT_INFO) continue;
      return message;
    }
  }

  private nextPacket(): Promise<Uint8Array> {
    this.throwIfFailed();
    const ready = this.queue.shift();
    if (ready) return Promise.resolve(ready);
    const waiter = new Deferred<Uint8Array>();
    this.waiters.push(waiter);
    return waiter.promise;
  }

  private send(payload: Uint8Array): void {
    this.throwIfFailed();
    const block = this.encrypt ? BLOCK : 8;
    let padding = block - ((5 + payload.length) % block);
    if (padding < 4) padding += block;
    const packet = concat(new Writer().uint32(1 + payload.length + padding).byte(padding).bytes(), payload, randomBytes(padding));
    if (this.encrypt) {
      const tag = mac(this.encrypt.macKey, this.sendSequence, packet);
      this.socket.write(concat(this.encrypt.stream.process(packet), tag));
    } else {
      this.socket.write(packet);
    }
    this.sendSequence = (this.sendSequence + 1) >>> 0;
  }

  private receive(data: Uint8Array): void {
    if (this.failure) return;
    this.inbox = concat(this.inbox, data);
    try {
      if (!this.versionSeen) this.readVersion();
      if (this.versionSeen) this.parse();
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
      this.socket.close();
    }
  }

  // The server's identification line; lines before it are a banner (RFC 4253, section 4.2)
  private readVersion(): void {
    for (;;) {
      const end = this.inbox.indexOf(0x0a);
      if (end < 0) {
        if (this.inbox.length > 8192) throw new SshError("This doesn't look like an SSH server.", 'protocol');
        return;
      }
      const line = utf8Decode(this.inbox.subarray(0, end)).replace(/\r$/, '');
      this.inbox = this.inbox.slice(end + 1);
      if (line.startsWith('SSH-')) {
        this.versionSeen = true;
        this.serverVersion.resolve(line);
        return;
      }
    }
  }

  private parse(): void {
    while (!this.holdAfterNewKeys) {
      const payload = this.decrypt ? this.parseEncrypted() : this.parsePlain();
      if (!payload) return;
      this.receiveSequence = (this.receiveSequence + 1) >>> 0;
      if (payload[0] === MSG.NEWKEYS) {
        if (this.strictKex) this.receiveSequence = 0;
        // What follows is encrypted with keys the handshake installs once it reads this
        this.holdAfterNewKeys = !this.decrypt;
      }
      const waiter = this.waiters.shift();
      if (waiter) waiter.resolve(payload);
      else this.queue.push(payload);
    }
  }

  private parsePlain(): Uint8Array | undefined {
    if (this.inbox.length < 5) return undefined;
    const length = new DataView(this.inbox.buffer, this.inbox.byteOffset, 4).getUint32(0);
    if (length > MAX_PACKET) throw new SshError('The SSH server sent a packet that is too large.', 'protocol');
    if (this.inbox.length < 4 + length) return undefined;
    const packet = this.inbox.subarray(0, 4 + length);
    this.inbox = this.inbox.slice(4 + length);
    return packet.slice(5, 4 + length - packet[4]);
  }

  private parseEncrypted(): Uint8Array | undefined {
    const decrypt = this.decrypt!;
    if (!this.firstBlock) {
      if (this.inbox.length < BLOCK) return undefined;
      this.firstBlock = decrypt.stream.process(this.inbox.subarray(0, BLOCK));
      this.inbox = this.inbox.slice(BLOCK);
    }
    const length = new DataView(this.firstBlock.buffer, this.firstBlock.byteOffset, 4).getUint32(0);
    if (length > MAX_PACKET || (4 + length) % BLOCK !== 0) throw new SshError('The SSH server sent a corrupt packet.', 'protocol');
    const rest = 4 + length - BLOCK;
    if (this.inbox.length < rest + MAC_LENGTH) return undefined;
    const packet = concat(this.firstBlock, decrypt.stream.process(this.inbox.subarray(0, rest)));
    const tag = this.inbox.subarray(rest, rest + MAC_LENGTH);
    if (!sameBytes(tag, mac(decrypt.macKey, this.receiveSequence, packet))) {
      throw new SshError('A packet from the console failed its integrity check.', 'protocol');
    }
    this.inbox = this.inbox.slice(rest + MAC_LENGTH);
    this.firstBlock = undefined;
    return packet.slice(5, 4 + length - packet[4]);
  }

  private unexpected(message: Uint8Array, during: string): SshError {
    return new SshError(`The console sent an unexpected message (${message[0]}) during ${during}.`, 'protocol');
  }

  private throwIfFailed(): void {
    if (this.failure) throw this.failure;
  }

  private fail(error: Error): void {
    if (this.failure) return;
    this.failure = error;
    this.serverVersion.reject(error);
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
    for (const channel of this.channels.values()) {
      channel.opened.reject(error);
      channel.requested.reject(error);
      channel.closed.reject(error);
    }
  }
}

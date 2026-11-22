// The cryptography this client speaks, built on the audited @noble libraries:
// - key exchange: curve25519-sha256 (RFC 8731)
// - host keys: ssh-ed25519 (RFC 8709) and ecdsa-sha2-nistp256 (RFC 5656)
// - encryption: aes256-ctr and aes128-ctr (RFC 4344), integrity: hmac-sha2-256 (RFC 6668)
// That is a modern set every current OpenSSH and Dropbear (Batocera's SSH server) offers.

import { ctr } from '@noble/ciphers/aes.js';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { p256 } from '@noble/curves/nist.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';

import { Reader, Writer, base64, concat } from './bytes';

export const KEX = ['curve25519-sha256', 'curve25519-sha256@libssh.org'];
export const HOST_KEYS = ['ssh-ed25519', 'ecdsa-sha2-nistp256'];
export const CIPHERS = ['aes256-ctr', 'aes128-ctr'];
export const MACS = ['hmac-sha2-256'];
export const BLOCK = 16;
export const MAC_LENGTH = 32;

export function keyLength(cipher: string): number {
  return cipher === 'aes128-ctr' ? 16 : 32;
}

export { randomBytes, sha256 };

export function x25519Pair(): { secret: Uint8Array; publicKey: Uint8Array } {
  const secret = x25519.utils.randomSecretKey();
  return { secret, publicKey: x25519.getPublicKey(secret) };
}

export function x25519Shared(secret: Uint8Array, peer: Uint8Array): Uint8Array {
  const shared = x25519.getSharedSecret(secret, peer);
  // An all-zero secret means the peer sent a low-order point (RFC 7748, section 6.1)
  if (shared.every((b) => b === 0)) throw new Error('The SSH server sent an invalid key');
  return shared;
}

// "SHA256:..." as `ssh-keygen -l` prints it, for the user to compare with the console's
export function fingerprint(hostKeyBlob: Uint8Array): string {
  return 'SHA256:' + base64(sha256(hostKeyBlob));
}

// Checks the server's signature of the exchange hash with the host key it sent
export function verifyHostSignature(hostKeyBlob: Uint8Array, signatureBlob: Uint8Array, exchangeHash: Uint8Array): boolean {
  const key = new Reader(hostKeyBlob);
  const keyType = key.text();
  const sig = new Reader(signatureBlob);
  const sigType = sig.text();
  if (keyType !== sigType) return false;

  if (keyType === 'ssh-ed25519') {
    return ed25519.verify(sig.string(), exchangeHash, key.string());
  }
  if (keyType === 'ecdsa-sha2-nistp256') {
    if (key.text() !== 'nistp256') return false;
    const point = key.string();
    const inner = new Reader(sig.string());
    const r = fixed32(inner.string());
    const s = fixed32(inner.string());
    // ecdsa-sha2-nistp256 signs SHA-256(H): prehash does that hash
    return p256.verify(concat(r, s), exchangeHash, point, { prehash: true, lowS: false });
  }
  return false;
}

// An mpint of a P-256 coordinate, as 32 big-endian bytes
function fixed32(mp: Uint8Array): Uint8Array {
  const digits = mp[0] === 0 ? mp.subarray(1) : mp;
  if (digits.length > 32) throw new Error('The SSH server sent an invalid signature');
  const out = new Uint8Array(32);
  out.set(digits, 32 - digits.length);
  return out;
}

// RFC 4253, section 7.2: each key is HASH(K || H || letter || session_id), extended with
// HASH(K || H || K1 || ...) until it is long enough
export function deriveKey(sharedK: Uint8Array, exchangeHash: Uint8Array, letter: string, sessionId: Uint8Array, length: number): Uint8Array {
  const k = new Writer().mpint(sharedK).bytes();
  let out: Uint8Array = sha256(concat(k, exchangeHash, Uint8Array.of(letter.charCodeAt(0)), sessionId));
  while (out.length < length) out = concat(out, sha256(concat(k, exchangeHash, out)));
  return out.slice(0, length);
}

// AES in counter mode as one stream across packets: every packet is a whole number of blocks, so
// each call starts at the next counter value
export class CtrStream {
  private counter: Uint8Array;

  constructor(
    private readonly key: Uint8Array,
    iv: Uint8Array,
  ) {
    this.counter = iv.slice(0, BLOCK);
  }

  process(data: Uint8Array): Uint8Array {
    if (data.length % BLOCK !== 0) throw new Error('AES-CTR data must be whole blocks');
    const out = ctr(this.key, this.counter).encrypt(data);
    this.advance(data.length / BLOCK);
    return out;
  }

  // Adds n to the 128-bit big-endian counter
  private advance(n: number): void {
    let carry = n;
    for (let i = BLOCK - 1; i >= 0 && carry > 0; i--) {
      const sum = this.counter[i] + (carry & 0xff);
      this.counter[i] = sum & 0xff;
      carry = (carry >>> 8) + (sum >> 8);
    }
  }
}

export function mac(key: Uint8Array, sequence: number, packet: Uint8Array): Uint8Array {
  return hmac(sha256, key, concat(new Writer().uint32(sequence).bytes(), packet));
}

// Compares two MACs in constant time
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

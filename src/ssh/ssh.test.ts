/// <reference types="node" />
// Unit tests of the SSH client's building blocks, run with Node: npm test
// The protocol itself is tested against a real console: tools/ssh-smoke.ts

import { ctr } from '@noble/ciphers/aes.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Reader, Writer, base64, fromBase64, mpint, utf8Decode, utf8Encode } from './bytes';
import { CtrStream, deriveKey, randomBytes } from './crypto';

test('UTF-8 round-trips text, accents and emoji', () => {
  const text = 'BatoX — Configurações 🎮';
  assert.deepEqual(utf8Encode(text), new Uint8Array(Buffer.from(text, 'utf8')));
  assert.equal(utf8Decode(utf8Encode(text)), text);
});

test('base64 matches Node without padding', () => {
  for (const n of [0, 1, 2, 3, 31, 32, 33]) {
    const bytes = randomBytes(n);
    assert.equal(base64(bytes), Buffer.from(bytes).toString('base64').replace(/=+$/, ''));
  }
});

test('mpint strips leading zeros and keeps the number positive', () => {
  assert.deepEqual(mpint(Uint8Array.of(0, 0, 0x12)), Uint8Array.of(0x12));
  assert.deepEqual(mpint(Uint8Array.of(0x80, 1)), Uint8Array.of(0, 0x80, 1));
  assert.deepEqual(mpint(Uint8Array.of(0, 0)), new Uint8Array(0));
});

test('Writer and Reader agree on every type', () => {
  const bytes = new Writer().byte(7).bool(true).uint32(0xfffffffe).string('olá').nameList(['a', 'b']).mpint(Uint8Array.of(0xff)).bytes();
  const r = new Reader(bytes);
  assert.equal(r.byte(), 7);
  assert.equal(r.bool(), true);
  assert.equal(r.uint32(), 0xfffffffe);
  assert.equal(r.text(), 'olá');
  assert.deepEqual(r.nameList(), ['a', 'b']);
  assert.deepEqual(r.string(), Uint8Array.of(0, 0xff));
  assert.equal(r.remaining, 0);
  assert.throws(() => r.byte());
});

test('AES-CTR as a stream equals one pass over the whole data', () => {
  const key = randomBytes(32);
  // A counter about to carry over its low bytes
  const iv = Uint8Array.from({ length: 16 }, (_, i) => (i < 12 ? i : 0xff));
  const data = randomBytes(16 * 40);
  const whole = ctr(key, iv).encrypt(data);
  const stream = new CtrStream(key, iv);
  const parts = [stream.process(data.subarray(0, 16)), stream.process(data.subarray(16, 16 * 7)), stream.process(data.subarray(16 * 7))];
  assert.deepEqual(Buffer.concat(parts), Buffer.from(whole));
});

test('key derivation extends past one hash', () => {
  const k = deriveKey(randomBytes(32), randomBytes(32), 'C', randomBytes(32), 64);
  assert.equal(k.length, 64);
});

test('base64 with padding and back', () => {
  for (const n of [0, 1, 2, 3, 4, 5, 100]) {
    const bytes = randomBytes(n);
    const text = base64(bytes, true);
    assert.equal(text, Buffer.from(bytes).toString('base64'));
    assert.deepEqual(fromBase64(text), bytes);
  }
});

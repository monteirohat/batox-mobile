/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checksumProblem, parseChecksums } from './install';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);

test('checksums are read from sha256sum lines, with or without the binary mark', () => {
  const sums = parseChecksums(`${A}  batox-linux-arm64\n${B} *batox\nnot a line\n`);
  assert.equal(sums.get('batox-linux-arm64'), A);
  assert.equal(sums.get('batox'), B);
  assert.equal(sums.size, 2);
});

test('files that match the release checksums pass', () => {
  const expected = new Map([
    ['batox-linux-arm64', A],
    ['batox', B],
  ]);
  assert.equal(checksumProblem(['batox-linux-arm64', 'batox'], expected, new Map(expected)), null);
});

test('a file that differs from its checksum fails', () => {
  const expected = new Map([['batox', A]]);
  assert.match(checksumProblem(['batox'], expected, new Map([['batox', B]])) ?? '', /corrupted/);
});

test('a file missing from the checksums fails instead of passing unchecked', () => {
  const expected = new Map([['batox', A]]);
  const actual = new Map([
    ['batox', A],
    ['batox-linux-arm64', B],
  ]);
  assert.match(checksumProblem(['batox-linux-arm64', 'batox'], expected, actual) ?? '', /isn't in the release's checksums/);
});

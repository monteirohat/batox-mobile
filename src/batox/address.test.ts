/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { consoleUrl, displayAddress, parseAddress } from './address';

test('addresses as people type them', () => {
  assert.deepEqual(parseAddress('batocera.local'), { host: 'batocera.local', port: 8080 });
  assert.deepEqual(parseAddress(' 192.168.0.10:9000 '), { host: '192.168.0.10', port: 9000 });
  assert.deepEqual(parseAddress('http://192.168.0.10:8080/#/library'), { host: '192.168.0.10', port: 8080 });
  assert.deepEqual(parseAddress('[fe80::1]:8081'), { host: 'fe80::1', port: 8081 });
  assert.deepEqual(parseAddress('fe80::1'), { host: 'fe80::1', port: 8080 });
  assert.equal(parseAddress(''), null);
  assert.equal(parseAddress('host:abc'), null);
  assert.equal(parseAddress('host:70000'), null);
});

test('URLs and labels', () => {
  assert.equal(consoleUrl({ host: 'fe80::1', port: 8080 }), 'http://[fe80::1]:8080/');
  assert.equal(displayAddress({ host: 'batocera.local', port: 8080 }), 'batocera.local');
  assert.equal(displayAddress({ host: '10.0.0.2', port: 9000 }), '10.0.0.2:9000');
});

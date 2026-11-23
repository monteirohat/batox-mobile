/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Extension } from './api';
import { installWarning, statusLine } from './extensions';

const base: Extension = { id: 'airplay', name: 'AirPlay receiver', supported: true, permissions: ['network', 'audio'] };

test("an extension's state, as the web panel words it", () => {
  assert.equal(statusLine({ ...base, enabled: false, status: { state: 'running' } }).text, 'Off');
  assert.equal(statusLine({ ...base, enabled: true, status: { state: 'restarting', restarts: 1 } }).text, 'Restarting: it stopped on its own and starts again in a moment  ·  restarted 1 time');
  assert.match(statusLine({ ...base, enabled: true, status: { state: 'stopped', error: 'exit 1' } }).text, /last stop: exit 1$/);
  assert.match(statusLine({ ...base, enabled: true, status: { state: 'running', since: '2026-11-22T22:54:06Z' } }).text, /^Running since /);
});

test('the install warning names what it may do', () => {
  assert.match(installWarning(base), /^It uses the network, uses the sound\. Like every program on Batocera/);
  assert.match(installWarning({ ...base, permissions: [] }), /^Like every program/);
});

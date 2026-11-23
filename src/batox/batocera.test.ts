/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BatoceraSetting } from './api';
import { categoryLabel, choiceText, controlOf, matches, shortKey, validKey, visible } from './batocera';

test("a category's name: friendly, a system's, or the prefix", () => {
  assert.equal(categoryLabel('global', {}), 'All emulators');
  assert.equal(categoryLabel('snes', { snes: 'Super Nintendo' }), 'Super Nintendo');
  assert.equal(categoryLabel('roshambo', {}), 'roshambo');
});

test('a key without its prefix, and choices as the web panel words them', () => {
  assert.equal(shortKey('audio', 'audio.volume'), 'volume');
  assert.equal(shortKey('gba', 'gba["Game.gba"].core'), 'gba["Game.gba"].core');
  assert.equal(choiceText({ value: 'suspend', label: 'Enter standby.' }, false), 'suspend — Enter standby');
  assert.equal(choiceText({ value: '1', label: 'Full' }, true), 'Full');
  assert.equal(choiceText({ value: 'auto' }, false), 'auto');
});

test('search looks in the key, label, value and description, never in a secret value', () => {
  const s: BatoceraSetting = { key: 'wifi.key', value: 'hunter2', active: true, sensitive: true, description: 'The network password' };
  assert.equal(controlOf(s).type, 'password');
  assert.ok(matches(s, 'WIFI'));
  assert.ok(matches(s, 'password'));
  assert.ok(!matches(s, 'hunter'));
});

test('suggested keys can be hidden, and empty categories go with them', () => {
  const cats = [
    { name: 'audio', settings: [{ key: 'audio.volume', value: '80', active: true }] },
    { name: 'kodi', settings: [{ key: 'kodi.enabled', value: '1', active: false }] },
  ];
  assert.deepEqual(visible(cats, false).map((c) => c.name), ['audio']);
  assert.equal(visible(cats, true).length, 2);
});

test('keys BatoX would refuse', () => {
  assert.ok(validKey('gba["Game.gba"].core'));
  assert.ok(!validKey('a b'));
  assert.ok(!validKey('a=b'));
  assert.ok(!validKey('#audio.volume'));
  assert.ok(!validKey('-x'));
  assert.ok(!validKey(''));
});

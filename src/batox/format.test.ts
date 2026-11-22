/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { duration, esDate, esYear, gameName } from './format';

test('game names and EmulationStation dates', () => {
  assert.equal(gameName('Golden Sun (USA).gba'), 'Golden Sun (USA)');
  assert.equal(gameName("'96 Zenkoku Koukou Soccer Senshuken (Japan).zip"), "'96 Zenkoku Koukou Soccer Senshuken (Japan)");
  assert.equal(gameName('Dr. Mario'), 'Dr. Mario');
  assert.equal(esYear('20010801T000000'), '2001');
  assert.equal(esYear(''), undefined);
  assert.ok(esDate('20261122T204512'));
});

test('durations', () => {
  assert.equal(duration(20), 'under a minute');
  assert.equal(duration(125), '2 min');
  assert.equal(duration(3 * 3600 + 7 * 60), '3 h 7 min');
  assert.equal(duration(2 * 86400 + 5 * 3600), '2 d 5 h');
});

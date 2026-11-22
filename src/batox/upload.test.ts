/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encodeExtValue, hasExtension } from './upload';

test('a file matches a system by its extension', () => {
  assert.equal(hasExtension('Golden Sun (USA).gba', ['.gba', '.zip']), true);
  assert.equal(hasExtension('GOLDEN SUN.ZIP', ['.gba', '.zip']), true);
  assert.equal(hasExtension('song.mp3', ['.gba', '.zip']), false);
  assert.equal(hasExtension('.gba', ['.gba']), false);
});

test('file names as RFC 5987 extended values', () => {
  assert.equal(encodeExtValue('Pokémon (USA).gba'), 'Pok%C3%A9mon%20%28USA%29.gba');
  assert.equal(encodeExtValue("'96 Zenkoku (Japan) [b].zip"), '%2796%20Zenkoku%20%28Japan%29%20%5Bb%5D.zip');
  assert.equal(encodeExtValue('Super Mario Bros. 3!*.nes'), 'Super%20Mario%20Bros.%203%21%2A.nes');
  assert.equal(decodeURIComponent(encodeExtValue('ドラゴンクエスト V.sfc')), 'ドラゴンクエスト V.sfc');
});

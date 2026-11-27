import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BiosSystem } from './api';
import { biosFolder, biosPlaced, biosProgress, biosSummary, filterBios } from './bios';

const sys = (name: string, games: number, found: number, files: string[]): BiosSystem => ({
  name,
  title: name.toUpperCase(),
  fullName: `Full ${name}`,
  games,
  found,
  total: files.length,
  files: files.map((f, i) => ({ path: `bios/${f}`, name: f, status: i < found ? 'ok' : 'missing' })),
});

const list = [sys('psx', 3, 1, ['scph5501.bin', 'scph1001.bin']), sys('gba', 10, 1, ['gba_bios.bin']), sys('nds', 0, 0, ['firmware.bin'])];

test('filters by games, completeness and search', () => {
  const names = (l: BiosSystem[]) => l.map((s) => s.name).join(',');
  assert.equal(names(filterBios(list, { show: 'all', withGames: true, search: '' })), 'psx,gba');
  assert.equal(names(filterBios(list, { show: 'all', withGames: false, search: '' })), 'psx,gba,nds');
  assert.equal(names(filterBios(list, { show: 'complete', withGames: false, search: '' })), 'gba');
  assert.equal(names(filterBios(list, { show: 'incomplete', withGames: false, search: '' })), 'psx,nds');
  // By a file's name, a system's short or full name, ignoring case
  assert.equal(names(filterBios(list, { show: 'all', withGames: false, search: 'SCPH1001' })), 'psx');
  assert.equal(names(filterBios(list, { show: 'all', withGames: false, search: 'full nds' })), 'nds');
});

test('sums up and counts', () => {
  assert.equal(biosSummary(list), '2 of 4 files in place; 1 of 3 systems have them all.');
  assert.equal(biosSummary([list[1]]), '1 of 1 file in place; 1 of 1 system has them all.');
  assert.equal(biosProgress(list[0]), '1 of 2 in place');
  assert.equal(biosProgress(list[1]), 'In place');
  assert.equal(biosProgress({ ...list[0], found: 2 }), 'All in place');
});

test('says where an upload went', () => {
  const full = (s: string) => ({ psx: 'PlayStation', amiga500: 'Amiga 500', amiga600: 'Amiga 600', amiga1200: 'Amiga 1200', cdtv: 'CDTV' })[s] ?? s;
  const base = { name: 'x', md5: 'm', unchanged: [] as string[] };
  assert.deepEqual(biosPlaced({ ...base, match: 'md5', saved: ['bios/scph5501.bin'], systems: ['psx'] }, full), { message: 'In place as scph5501.bin (PlayStation)' });
  assert.deepEqual(biosPlaced({ ...base, match: 'md5', saved: ['bios/kick.rom'], systems: ['amiga500', 'amiga600', 'amiga1200', 'cdtv'] }, full), {
    message: 'In place as kick.rom (Amiga 500, Amiga 600, Amiga 1200 and 1 more)',
  });
  assert.deepEqual(biosPlaced({ ...base, match: 'name', saved: ['bios/scph1001.bin'], systems: ['psx'] }, full), {
    message: "Saved as scph1001.bin, but it isn't the version Batocera checks for",
    warn: true,
  });
  assert.deepEqual(biosPlaced({ ...base, match: 'none', saved: ['bios/x.bin'], systems: [] }, full), { message: "Not in Batocera's list: saved in the BIOS folder" });
  assert.deepEqual(biosPlaced({ ...base, match: 'md5', saved: [], unchanged: ['bios/scph5501.bin'], systems: ['psx'] }, full), { message: 'Already there, as scph5501.bin' });
});

test('shows the folder only outside the main one', () => {
  assert.equal(biosFolder('bios/scph5501.bin'), '');
  assert.equal(biosFolder('bios/dc/naomi.zip'), 'bios/dc/');
  assert.equal(biosFolder('saves/dolphin-emu/Triforce/segaboot.gcm'), 'saves/dolphin-emu/Triforce/');
});

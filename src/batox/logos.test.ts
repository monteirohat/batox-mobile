/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aspect, cutOf, whiten } from './logos';

test('a logo gets a viewBox from its size, and a group the white filter applies to', () => {
  const xml = whiten('<?xml version="1.0"?><!-- Inkscape --><svg xmlns="http://www.w3.org/2000/svg" width="566.929" height="66.041"><path fill="#1F00CC" d="M0 0h10v10z"/></svg>', '');
  assert.ok(xml);
  assert.match(xml, /^<svg viewBox="0 0 566.929 66.041" xmlns=/);
  assert.match(xml, /<filter id="batox-logo"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1 {2}0 0 0 0 1 {2}0 0 0 0 1 {2}0 0 0 1 0"\/><\/filter>/);
  assert.match(xml, /<g filter="url\(#batox-logo\)"><path fill="#1F00CC" d="M0 0h10v10z"\/><\/g><\/svg>$/);
  assert.equal(aspect(xml)?.toFixed(3), (566.929 / 66.041).toFixed(3));
});

test('a logo with a viewBox keeps it', () => {
  const xml = whiten('<svg viewBox="-236.252 381.062 530.294 98.493" xmlns="http://www.w3.org/2000/svg"><ellipse/></svg>', '');
  assert.ok(xml);
  assert.equal((xml.match(/viewBox/g) ?? []).length, 1);
  assert.equal(aspect(xml)?.toFixed(3), (530.294 / 98.493).toFixed(3));
});

test('a logo on a plate loses it: the mask keeps what is brighter than the plate', () => {
  assert.equal(cutOf('megadrive'), 'dark');
  assert.equal(cutOf('c64'), 'gray');
  assert.equal(cutOf('snes'), '');
  const xml = whiten('<svg width="10" height="10"><rect fill="#5d594f"/></svg>', 'gray');
  assert.ok(xml);
  assert.match(xml, /values="0 0 0 0 0 {2}0 0 0 0 0 {2}0 0 0 0 0 {2}1.86875 3.66875 0.7125 0 -2.3125" result="mask"/);
  assert.match(xml, /<feComposite in="SourceGraphic" in2="mask" operator="in" result="kept"\/>/);
});

test("a file that isn't an SVG, or one with no size, is refused", () => {
  assert.equal(whiten('\u0089PNG', ''), null);
  assert.equal(whiten('<svg><path/></svg>', ''), null);
});

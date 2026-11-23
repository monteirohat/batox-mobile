// Systems' logos, from BatoX (GET /consoles/{name}/logo): the current theme's, or else the one of
// Batocera's default theme. They are drawn in white, as on the web panel and batox-theme's home.

import { urlHost } from './address';
import type { Endpoint } from './api';

export type Cut = '' | 'dark' | 'gray';

// In Batocera's default theme these logos come on a dark or a gray plate, which is cut off before
// they turn white; and these can't be whitened at all, so their name stands in. The lists are
// batox-theme's (_inc/variables.xml: logoCutDark, logoCutGray, logoAsName), which are newer than
// the web panel's.
const CUT_DARK = new Set(
  'megadrive megadrive-japan gba msx msx1 msx2 msx2+ msxturbor msxlaserdisk pygame 3do atarilynx dragon32 dynax enterprise epic fallout1-ce gx4000 gzdoom lowresnx vis coleco lcdgames odyssey2 arcadia auto-retroachievements auto-verticalarcade cdogs colecovision eduke32 etlegacy fallout2-ce gbah genesis genh ggh gp32 hcl hurrican irem megacd model2 model3 mrboom neogeo64 openjazz pokemini powerbomberman pyxel residualvm retrobat scv solarus sonic3-air starship superbroswar teknoparrot thextech vpinball zaccariapinball'.split(' '),
);
const CUT_GRAY = new Set('c64 c16 c20 c128 plus4 cplus4 atari gong kaneko msu-md neogeomvs segacd snesh trs-80 arduboy nintendo auto-strategy advision auto-favorites auto-lightgun lightgun bennugd capcom cps2 gbch internet nesh openbor pinballfx3 plugnplay prboom sonic-mania tvgames'.split(' '));
const AS_NAME = new Set('auto-allgames pinballfx2'.split(' '));

export const logoAsName = (name: string) => AS_NAME.has(name);

export function cutOf(name: string): Cut {
  return CUT_DARK.has(name) ? 'dark' : CUT_GRAY.has(name) ? 'gray' : '';
}

const WHITE = '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0';

// The web panel's logo-cut filters keep the pixels brighter than the plate: alpha = 6.25 × luma −
// intercept. react-native-svg has no feComponentTransfer, so that line goes in the matrix's alpha
// row, and feComposite keeps the logo's own transparency.
function mask(intercept: number): string {
  const k = 6.25;
  const r = (n: number) => Number((n * k).toFixed(5));
  return `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${r(0.299)} ${r(0.587)} ${r(0.114)} 0 ${-intercept}`;
}

function filter(cut: Cut): string {
  if (!cut) return `<filter id="batox-logo"><feColorMatrix in="SourceGraphic" type="matrix" values="${WHITE}"/></filter>`;
  return (
    '<filter id="batox-logo">' +
    `<feColorMatrix in="SourceGraphic" type="matrix" values="${mask(cut === 'dark' ? 1.0625 : 2.3125)}" result="mask"/>` +
    '<feComposite in="SourceGraphic" in2="mask" operator="in" result="kept"/>' +
    `<feColorMatrix in="kept" type="matrix" values="${WHITE}"/>` +
    '</filter>'
  );
}

const size = (v: string | undefined) => (v ? parseFloat(v) : NaN);

// An SVG logo, ready for SvgXml: a viewBox so it scales (some themes give only a width and a
// height), and everything in a group that the filter turns white. Returns null for a file that
// isn't an SVG.
export function whiten(xml: string, cut: Cut): string | null {
  const text = xml
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
  const open = /<svg\b[^>]*>/i.exec(text);
  const end = text.lastIndexOf('</svg>');
  if (!open || end < open.index) return null;
  let tag = open[0];
  if (!/\bviewBox\s*=/.test(tag)) {
    const w = size(/\bwidth\s*=\s*["']([^"']+)["']/.exec(tag)?.[1]);
    const h = size(/\bheight\s*=\s*["']([^"']+)["']/.exec(tag)?.[1]);
    if (!(w > 0 && h > 0)) return null;
    tag = tag.replace(/<svg\b/i, `<svg viewBox="0 0 ${w} ${h}"`);
  }
  const start = open.index + open[0].length;
  return `${text.slice(0, open.index)}${tag}<defs>${filter(cut)}</defs><g filter="url(#batox-logo)">${text.slice(start, end)}</g></svg>`;
}

// The width over the height of an SVG's viewBox, to size its box
export function aspect(xml: string): number | null {
  const box = /\bviewBox\s*=\s*["']([^"']+)["']/.exec(xml)?.[1].trim().split(/[\s,]+/).map(Number);
  return box && box.length === 4 && box[2] > 0 && box[3] > 0 ? box[2] / box[3] : null;
}

export type Logo = { kind: 'svg'; xml: string; aspect: number | null } | { kind: 'image' } | { kind: 'none' };

const cache = new Map<string, Logo>();
const loading = new Map<string, Promise<Logo>>();
// EmulationStation serves the logos one request at a time, so they are asked for one after another
let queue: Promise<unknown> = Promise.resolve();

export function cachedLogo(e: Endpoint, name: string): Logo | undefined {
  return cache.get(`${e.host}:${e.port}/${name}`);
}

export function loadLogo(e: Endpoint, name: string, cut: Cut): Promise<Logo> {
  const key = `${e.host}:${e.port}/${name}`;
  const known = cache.get(key) ?? loading.get(key);
  if (known) return Promise.resolve(known);
  const job = queue.then(() => fetchLogo(e, name, cut)).then((logo) => {
    cache.set(key, logo);
    loading.delete(key);
    return logo;
  });
  queue = job.catch(() => undefined);
  loading.set(key, job);
  return job;
}

async function fetchLogo(e: Endpoint, name: string, cut: Cut): Promise<Logo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`http://${urlHost(e.host)}:${e.port}/api/v1/consoles/${encodeURIComponent(name)}/logo`, {
      headers: e.token ? { Authorization: `Bearer ${e.token}` } : {},
      signal: controller.signal,
    });
    if (!res.ok) return { kind: 'none' };
    if (!(res.headers.get('content-type') ?? '').includes('svg')) return { kind: 'image' };
    const xml = whiten(await res.text(), cut);
    return xml ? { kind: 'svg', xml, aspect: aspect(xml) } : { kind: 'none' };
  } catch {
    return { kind: 'none' };
  } finally {
    clearTimeout(timer);
  }
}

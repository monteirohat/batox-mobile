// SSH's wire types (RFC 4251, section 5): byte, boolean, uint32, string, mpint and name-list, read
// and written over plain Uint8Arrays. Text is UTF-8, encoded here so the code doesn't depend on
// TextEncoder/TextDecoder being present in the JavaScript engine.

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      c = Math.min(c, 0x10ffff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return Uint8Array.from(out);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let c: number;
    let n: number;
    if (b < 0x80) [c, n] = [b, 1];
    else if (b >= 0xc0 && b < 0xe0) [c, n] = [b & 31, 2];
    else if (b >= 0xe0 && b < 0xf0) [c, n] = [b & 15, 3];
    else if (b >= 0xf0 && b < 0xf8) [c, n] = [b & 7, 4];
    else {
      out += '�';
      i++;
      continue;
    }
    if (i + n > bytes.length) {
      out += '�';
      break;
    }
    for (let k = 1; k < n; k++) c = (c << 6) | (bytes[i + k] & 63);
    out += String.fromCodePoint(c);
    i += n;
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Base64; without padding it is how OpenSSH prints key fingerprints
export function base64(bytes: Uint8Array, pad = false): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let k = 0; k < chars; k++) out += B64[(n >> (18 - 6 * k)) & 63];
  }
  return pad ? out.padEnd(Math.ceil(out.length / 4) * 4, '=') : out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let bits = 0;
  let value = 0;
  let at = 0;
  for (const ch of clean) {
    value = (value << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (value >> bits) & 0xff;
    }
  }
  return out;
}

// An mpint is a two's complement big-endian number: strip leading zeros, and keep one zero in
// front when the top bit is set, so a positive number doesn't read as negative.
export function mpint(unsigned: Uint8Array): Uint8Array {
  let start = 0;
  while (start < unsigned.length && unsigned[start] === 0) start++;
  const digits = unsigned.subarray(start);
  return digits.length > 0 && digits[0] & 0x80 ? concat(Uint8Array.of(0), digits) : digits;
}

export class Writer {
  private parts: Uint8Array[] = [];

  byte(n: number): this {
    this.parts.push(Uint8Array.of(n & 0xff));
    return this;
  }

  bool(b: boolean): this {
    return this.byte(b ? 1 : 0);
  }

  uint32(n: number): this {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n >>> 0);
    this.parts.push(b);
    return this;
  }

  raw(bytes: Uint8Array): this {
    this.parts.push(bytes);
    return this;
  }

  string(value: Uint8Array | string): this {
    const bytes = typeof value === 'string' ? utf8Encode(value) : value;
    return this.uint32(bytes.length).raw(bytes);
  }

  nameList(names: string[]): this {
    return this.string(names.join(','));
  }

  mpint(unsigned: Uint8Array): this {
    return this.string(mpint(unsigned));
  }

  bytes(): Uint8Array {
    return concat(...this.parts);
  }
}

export class Reader {
  private at = 0;

  constructor(private readonly buf: Uint8Array) {}

  private take(n: number): Uint8Array {
    if (this.at + n > this.buf.length) throw new Error('SSH message ended too early');
    const out = this.buf.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }

  byte(): number {
    return this.take(1)[0];
  }

  bool(): boolean {
    return this.byte() !== 0;
  }

  uint32(): number {
    const b = this.take(4);
    return new DataView(b.buffer, b.byteOffset, 4).getUint32(0);
  }

  string(): Uint8Array {
    return this.take(this.uint32());
  }

  text(): string {
    return utf8Decode(this.string());
  }

  nameList(): string[] {
    const text = this.text();
    return text ? text.split(',') : [];
  }

  // A raw run of n bytes, such as the 16-byte cookie of KEXINIT
  raw(n: number): Uint8Array {
    return this.take(n);
  }

  get remaining(): number {
    return this.buf.length - this.at;
  }
}

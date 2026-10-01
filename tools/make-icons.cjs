// Regenerates icons/*.png from one shape description, so the icons are not
// binaries of unknown origin. Run: node tools/make-icons.cjs
// Needs nothing but Node (zlib is built in).
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'icons');
const BG = [0x67, 0x50, 0xa4];   // mdui primary
const FG = [0xff, 0xff, 0xff];

// ---------------------------------------------------------------- png encoder
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;                       // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // truecolour with alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- shapes (0..1)
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// signed distance to a rounded rectangle
function sdRoundRect(u, v, cx, cy, hw, hh, r) {
  const qx = Math.abs(u - cx) - (hw - r);
  const qy = Math.abs(v - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function render(size, maskable, glyphScale) {
  const rgba = Buffer.alloc(size * size * 4);
  const bgR = maskable ? null : 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;

      let bgA = 1;
      if (bgR !== null) bgA = clamp01(0.5 - (Math.hypot(u - 0.5, v - 0.5) - bgR) * size);

      const gu = 0.5 + (u - 0.5) / glyphScale;
      const gv = 0.5 + (v - 0.5) / glyphScale;

      let g = 0;
      // 麥克風的頭
      g = Math.max(g, clamp01(0.5 - sdRoundRect(gu, gv, 0.5, 0.40, 0.115, 0.15, 0.115) * size));
      // 下面的 U 型架（只畫下半圈）
      {
        const R = 0.20, half = 0.017;
        const d = Math.abs(Math.hypot(gu - 0.5, gv - 0.44) - R) - half;
        const a = clamp01(0.5 - d * size) * clamp01((gv - 0.44) * size + 0.5);
        g = Math.max(g, a);
      }
      // 支架
      g = Math.max(g, clamp01(0.5 - sdRoundRect(gu, gv, 0.5, 0.685, 0.024, 0.048, 0.024) * size));
      // 底座
      g = Math.max(g, clamp01(0.5 - sdRoundRect(gu, gv, 0.5, 0.765, 0.13, 0.024, 0.024) * size));

      const a = Math.max(bgA, g);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(g >= bgA ? FG[c] : BG[c]);
      }
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return encodePNG(size, size, rgba);
}

fs.mkdirSync(OUT, { recursive: true });
const jobs = [
  ['icon-192.png', 192, false, 1],
  ['icon-512.png', 512, false, 1],
  ['icon-maskable-192.png', 192, true, 0.72],
  ['icon-maskable-512.png', 512, true, 0.72],
  ['apple-touch-icon.png', 180, true, 0.76],
];
for (const [name, size, maskable, scale] of jobs) {
  const buf = render(size, maskable, scale);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('[OK]', name, size + 'x' + size, buf.length + ' bytes');
}

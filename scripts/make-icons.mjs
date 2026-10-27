// Generates PNG icons (no dependencies). Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

// Signed distance to a rounded rect (centre cx,cy, half-size hx,hy, radius r)
const sdRound = (x, y, cx, cy, hx, hy, r) => {
  const dx = Math.abs(x - cx) - (hx - r);
  const dy = Math.abs(y - cy) - (hy - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const S = 4; // supersampling
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const u = (x + (sx + 0.5) / S) / size; // 0..1
          const v = (y + (sy + 0.5) / S) / size;
          if (sdRound(u, v, 0.5, 0.5, 0.5, 0.5, 0.22) <= 0) {
            bg++;
            // Two interlocking link capsules rotated 45deg, drawn as rings
            const ru = (u - 0.5) * Math.SQRT1_2 + (v - 0.5) * Math.SQRT1_2;
            const rv = -(u - 0.5) * Math.SQRT1_2 + (v - 0.5) * Math.SQRT1_2;
            const ring = (cx) => {
              const d = sdRound(ru, rv, cx, 0, 0.19, 0.11, 0.11);
              return d <= 0 && d > -0.05;
            };
            if (ring(-0.11) || ring(0.11)) fg++;
          }
        }
      }
      const n = S * S;
      const i = (y * size + x) * 4;
      const a = bg / n;
      const f = bg ? fg / bg : 0;
      // blue #0b57d0 -> white blend
      px[i] = Math.round(11 + (255 - 11) * f);
      px[i + 1] = Math.round(87 + (255 - 87) * f);
      px[i + 2] = Math.round(208 + (255 - 208) * f);
      px[i + 3] = Math.round(a * 255);
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const s of [16, 32, 48, 128]) writeFileSync(`public/icons/icon-${s}.png`, render(s));
console.log('icons written');

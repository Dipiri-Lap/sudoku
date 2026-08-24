// 보석 스프라이트 시트에서 한 모양(행)을 골라 색깔별 PNG로 잘라낸다.
//
//   node scripts/extract-jewels.mjs [모양] [출력디렉터리]
//   node scripts/extract-jewels.mjs hexagon          (기본값)
//   node scripts/extract-jewels.mjs star public/assets/3match/stars
//
// 원본: src/assets/3match/jewelTile.png (8열 x 5행, RGBA)
//   - public/ 에 두지 않는 이유: 2.2MB 원본이 그대로 배포에 실린다.
//     게임은 여기서 잘라낸 결과물만 쓴다.
//   - 알파 채널은 이미 들어 있다(배경 alpha=0). 다만 투명 영역의 RGB에는
//     무지개 배경색이 남아 있어서, 축소할 때 알파 가중 평균을 쓰지 않으면
//     가장자리에 무지개 테두리가 번진다.
//
// 의존성 없이 동작하도록 PNG 디코더/인코더를 직접 넣었다(node:zlib만 사용).

import fs from 'node:fs';
import zlib from 'node:zlib';

function decodePng(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  if (buf[24] !== 8 || buf[25] !== 6 || buf[28] !== 0) throw new Error('need 8bit RGBA non-interlaced');
  const idat = [];
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.slice(o + 4, o + 8).toString('ascii');
    if (type === 'IDAT') idat.push(buf.slice(o + 8, o + 8 + len));
    if (type === 'IEND') break;
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.slice(p, p + stride); p += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prior = y > 0 ? out.slice((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prior ? prior[x] : 0;
      const c = prior && x >= bpp ? prior[x - bpp] : 0;
      let v = line[x];
      switch (filter) {
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          break;
        }
      }
      cur[x] = v & 0xff;
    }
  }
  return { width: w, height: h, data: out };
}

function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const T = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c ^ -1; }


// 원본은 8열 x 5행 시트이고 알파 채널이 이미 들어 있다(배경 alpha=0).
// 다만 투명 영역의 RGB에는 무지개 색이 그대로 남아 있으므로, 축소할 때
// 반드시 알파 가중 평균을 써야 가장자리에 무지개 테두리가 생기지 않는다.
const SRC = 'src/assets/3match/jewelTile.png';
const ROWS = ['octagon', 'diamond', 'triangle', 'hexagon', 'star'];
const SHAPE = process.argv[2] ?? 'hexagon';
const OUT_DIR = process.argv[3] ?? 'public/assets/3match/gems';
const OUT_SIZE = 128;
const COLORS = 6;

const { width: W, height: H, data } = decodePng(fs.readFileSync(SRC));
const at = (x, y) => (y * W + x) * 4;
// 보석 주변의 옅은 글로우(alpha 10~60)가 행끼리 이어져 버려서, 경계 탐지에는
// 높은 임계값을 쓴다. 잘라낼 때는 모든 픽셀을 그대로 가져가므로 글로우는 살아 있다.
const A_MIN = 140;

function bands(limit, len, hasInk) {
  const out = [];
  let start = -1;
  for (let i = 0; i < len; i++) {
    const on = hasInk(i);
    if (on && start < 0) start = i;
    if (!on && start >= 0) { out.push([start, i - 1]); start = -1; }
  }
  if (start >= 0) out.push([start, len - 1]);
  return out.filter(([a, b]) => b - a > 20).slice(0, limit);
}

const rowBands = bands(5, H, y => { for (let x = 0; x < W; x++) if (data[at(x, y) + 3] > A_MIN) return true; return false; });
const [ry0, ry1] = rowBands[ROWS.indexOf(SHAPE)];
const colBands = bands(8, W, x => { for (let y = ry0; y <= ry1; y++) if (data[at(x, y) + 3] > A_MIN) return true; return false; });

function extract(x0, x1, y0, y1) {
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const box = Math.round(Math.max(cw, ch) * 1.06); // 여백 3%
  const ox = x0 - Math.round((box - cw) / 2);
  const oy = y0 - Math.round((box - ch) / 2);
  const out = Buffer.alloc(OUT_SIZE * OUT_SIZE * 4);
  const scale = box / OUT_SIZE;

  for (let y = 0; y < OUT_SIZE; y++) {
    for (let x = 0; x < OUT_SIZE; x++) {
      const sx0 = Math.floor(ox + x * scale), sx1 = Math.max(sx0 + 1, Math.floor(ox + (x + 1) * scale));
      const sy0 = Math.floor(oy + y * scale), sy1 = Math.max(sy0 + 1, Math.floor(oy + (y + 1) * scale));
      let r = 0, g = 0, b = 0, aSum = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          n++;
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
          const o = at(sx, sy), a = data[o + 3];
          r += data[o] * a; g += data[o + 1] * a; b += data[o + 2] * a; aSum += a;
        }
      }
      const o = (y * OUT_SIZE + x) * 4;
      if (aSum === 0) { out[o + 3] = 0; continue; }
      out[o] = Math.round(r / aSum);
      out[o + 1] = Math.round(g / aSum);
      out[o + 2] = Math.round(b / aSum);
      out[o + 3] = Math.round(aSum / n);
    }
  }
  return { width: OUT_SIZE, height: OUT_SIZE, data: out };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (let i = 0; i < COLORS; i++) {
  const [cx0, cx1] = colBands[i];
  const file = `${OUT_DIR}/gem-${i}.png`;
  fs.writeFileSync(file, encodePng(extract(cx0, cx1, ry0, ry1)));
  console.log(file, (fs.statSync(file).size / 1024).toFixed(1) + 'KB');
}

import type { Rng } from './rng';

/**
 * 판 모양과 장애물 배치 무늬.
 *
 * 레퍼런스(로얄매치·캔디크러시)는 거의 매 판 생김새가 다르다. 틀 몇 개를 돌려 쓰면
 * 100판만 넘어도 "다 해 본 판"이 된다. 그래서 판 모양은 **매 판 새로 조각한다**:
 * 7~9칸 판에서 시작해 귀퉁이 깎기·옆 홈·위아래 물기·안쪽 구멍·계단·가운데 틈 같은
 * 조각을 크기와 자리를 바꿔 가며 몇 번 적용한다. 같은 모양이 최근 판과 겹치면
 * schedule.ts가 다시 조각한다.
 *
 * 조각은 대부분 좌우 대칭으로 한다 - 사람이 디자인한 판처럼 보이고 읽기 쉽다.
 * 가끔은 180도 회전 대칭이나 비대칭도 섞는다.
 */

export type Mask = boolean[][];

type Cut = (m: Mask, rng: Rng) => void;

const H = (m: Mask) => m.length;
const W = (m: Mask) => m[0].length;

function off(m: Mask, r: number, c: number) {
  if (r >= 0 && r < H(m) && c >= 0 && c < W(m)) m[r][c] = false;
}

/** 귀퉁이를 계단 삼각형으로 깎는다(위 또는 아래) */
const cornerCut: Cut = (m, rng) => {
  const k = 1 + rng.int(Math.min(3, Math.floor(W(m) / 3)));
  const bottom = rng.next() < 0.4;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k - i; j++) off(m, bottom ? H(m) - 1 - i : i, j);
  }
};

/** 옆 가장자리를 네모로 판다 */
const sideNotch: Cut = (m, rng) => {
  const depth = 1 + rng.int(2);
  const len = 1 + rng.int(3);
  const r0 = 1 + rng.int(Math.max(1, H(m) - len - 1));
  for (let r = r0; r < r0 + len; r++) for (let c = 0; c < depth; c++) off(m, r, c);
};

/** 위에서 네모로 문다(맨 윗줄은 다른 칸이 남아 보석이 들어온다) */
const topBite: Cut = (m, rng) => {
  const width = 1 + rng.int(2);
  const depth = 1 + rng.int(Math.max(1, Math.floor(H(m) / 3)));
  const c0 = rng.int(Math.max(1, Math.floor(W(m) / 2) - width + 1));
  for (let r = 0; r < depth; r++) for (let c = c0; c < c0 + width; c++) off(m, r, c);
};

/** 아래에서 네모로 문다 */
const bottomBite: Cut = (m, rng) => {
  const width = 1 + rng.int(3);
  const depth = 1 + rng.int(2);
  const c0 = rng.int(Math.max(1, Math.floor(W(m) / 2) - width + 1));
  for (let r = H(m) - depth; r < H(m); r++) for (let c = c0; c < c0 + width; c++) off(m, r, c);
};

/** 안쪽에 구멍(점·막대·네모) */
const innerHole: Cut = (m, rng) => {
  const hw = 1 + rng.int(2);
  const hh = 1 + rng.int(2);
  const r0 = 1 + rng.int(Math.max(1, H(m) - hh - 2));
  const c0 = 1 + rng.int(Math.max(1, Math.floor(W(m) / 2) - hw));
  for (let r = r0; r < r0 + hh; r++) for (let c = c0; c < c0 + hw; c++) off(m, r, c);
};

/** 아래로 갈수록 좁아진다(V자·방패 모양) */
const taper: Cut = (m, rng) => {
  const rows = 1 + rng.int(Math.max(1, Math.floor(H(m) / 3)));
  for (let i = 0; i < rows; i++) {
    for (let c = 0; c <= i; c++) off(m, H(m) - rows + i, c);
  }
};

/** 가운데 세로 틈 - 판을 두 방으로 가른다 */
const split: Cut = (m, rng) => {
  const top = 1 + rng.int(Math.max(1, Math.floor(H(m) / 2)));
  const bottom = H(m) - 1 - rng.int(2);
  const c = Math.floor((W(m) - 1) / 2);
  for (let r = top; r <= bottom; r++) off(m, r, c);
};

/** 한쪽을 계단으로 깎는다 */
const stairs: Cut = (m, rng) => {
  const k = 2 + rng.int(Math.max(1, Math.floor(W(m) / 3)));
  const fromTop = rng.next() < 0.5;
  for (let i = 0; i < k; i++) {
    const r = fromTop ? i : H(m) - 1 - i;
    for (let c = 0; c < k - i; c++) off(m, r, c);
  }
};

/** 다이아몬드·팔각형 계열: 네 귀퉁이를 크게 깎는다 */
const roundOff: Cut = (m, rng) => {
  const k = 1 + rng.int(Math.max(1, Math.floor(W(m) / 3)));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k - i; j++) {
      off(m, i, j);
      off(m, H(m) - 1 - i, j);
    }
  }
};

/** 가로 틈 - 위아래 방을 좁은 목으로 잇는다 */
const waist: Cut = (m, rng) => {
  const r = Math.floor(H(m) / 2) + rng.int(2) - 1;
  const keep = 1 + rng.int(2);
  const half = Math.floor(W(m) / 2);
  for (let c = 0; c < half - keep + 1; c++) off(m, r, c);
};

const CUTS: { cut: Cut; weight: number }[] = [
  { cut: cornerCut, weight: 3 },
  { cut: sideNotch, weight: 3 },
  { cut: topBite, weight: 2 },
  { cut: bottomBite, weight: 2 },
  { cut: innerHole, weight: 3 },
  { cut: taper, weight: 1.5 },
  { cut: split, weight: 1 },
  { cut: stairs, weight: 1.5 },
  { cut: roundOff, weight: 2 },
  { cut: waist, weight: 1 },
];

function pickCut(rng: Rng): Cut {
  const total = CUTS.reduce((s, x) => s + x.weight, 0);
  let r = rng.next() * total;
  for (const x of CUTS) {
    r -= x.weight;
    if (r < 0) return x.cut;
  }
  return CUTS[0].cut;
}

/**
 * 판 하나를 조각한다.
 *
 * 조각은 왼쪽 절반 기준으로 한 뒤 대칭을 입힌다: 좌우 대칭(대부분) / 180도 회전 대칭 /
 * 비대칭(가끔). 채울 수 없거나 너무 깎인 판이 되면 그 조각은 되돌린다.
 */
export function sculptMask(width: number, cuts: number, rng: Rng, height = width): Mask {
  // 가로는 휴대폰 폭에 맞춰 9칸까지, 세로는 더 길 수 있다(다른 3매치의 세로로 긴 판)
  let m: Mask = Array.from({ length: height }, () => Array.from({ length: width }, () => true));
  const sym = rng.next();
  const mode = sym < 0.72 ? 'mirror' : sym < 0.9 ? 'rotate' : 'none';
  for (let i = 0; i < cuts; i++) {
    const trial = m.map(row => row.slice());
    const half = m.map(row => row.map(() => true));
    pickCut(rng)(half, rng);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (half[r][c]) continue;
        trial[r][c] = false;
        if (mode === 'mirror') trial[r][width - 1 - c] = false;
        if (mode === 'rotate') trial[height - 1 - r][width - 1 - c] = false;
      }
    }
    if (isFillable(trial)) m = trial;
  }
  return m;
}

/** 모양을 비교하기 위한 지문 */
export function maskKey(m: Mask): string {
  return m.map(row => row.map(v => (v ? '1' : '0')).join('')).join('/');
}

/**
 * 모든 칸이 채워질 수 있는가.
 *
 * 새 보석은 맨 윗줄로만 들어오고, 거기서 아래·대각선 아래로 흘러간다(gravity.ts).
 * 그 길로 닿지 않는 칸은 영영 빈 칸으로 남는다. 또 칸이 너무 적으면 판이 답답하다.
 */
export function isFillable(mask: Mask): boolean {
  const h = mask.length;
  const w = mask[0].length;
  let total = 0;
  mask.forEach(row => row.forEach(v => (total += v ? 1 : 0)));
  if (total < w * h * 0.58) return false;
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  for (let c = 0; c < w; c++) {
    if (mask[0][c]) {
      queue.push([0, c]);
      seen.add(`0,${c}`);
    }
  }
  while (queue.length > 0) {
    const [r, c] = queue.pop()!;
    for (const dc of [0, -1, 1]) {
      const nr = r + 1;
      const nc = c + dc;
      if (nr >= h || nc < 0 || nc >= w || !mask[nr][nc] || seen.has(`${nr},${nc}`)) continue;
      seen.add(`${nr},${nc}`);
      queue.push([nr, nc]);
    }
  }
  return seen.size === total;
}

// ── 장애물 배치 무늬 ─────────────────────────────────────────────────

export type Pattern =
  | 'scatter'
  | 'mirror'
  | 'band'
  | 'pillars'
  | 'frame'
  | 'cluster'
  | 'diagonal'
  | 'checker'
  | 'bottom'
  | 'top'
  /** 앞서 놓은 것(목표물)을 둘러싼다 - "이걸 뚫어야 목표에 닿는다" */
  | 'guard';

/** 놓을 구역. 판을 위·가운데·아래로 나눠 판마다 무게 중심이 달라지게 한다 */
export type Zone = 'top' | 'middle' | 'bottom' | 'any';

type Cell = [number, number];

/**
 * 무늬대로 칸을 고른다.
 *
 * @param free   놓을 수 있는 칸(판 안, 아직 빈 칸, 그 요소가 놓일 수 있는 줄·구역)
 * @param n      대략 몇 개
 * @param anchor 'guard'가 둘러쌀 칸들(앞서 놓은 목표물)
 *
 * 무늬는 모양이 먼저라 개수가 딱 맞지 않는다(테두리 한 바퀴는 n개가 아니다).
 * n의 절반~1.7배 안이면 무늬 그대로 쓰고, 벗어나면 대칭 흩뿌리기로 물러선다.
 * 목표 개수는 실제로 놓인 칸에서 세므로 어긋나지 않는다.
 */
export function patternCells(
  pattern: Pattern,
  free: Cell[],
  w: number,
  h: number,
  n: number,
  rng: Rng,
  anchor: Cell[] = [],
): Cell[] {
  const has = new Set(free.map(([r, c]) => `${r},${c}`));
  const ok = (r: number, c: number) => has.has(`${r},${c}`);
  const rows = [...new Set(free.map(([r]) => r))].sort((a, b) => a - b);
  const cr = rows.length > 0 ? (rows[0] + rows[rows.length - 1]) / 2 : (h - 1) / 2;
  const cc = (w - 1) / 2;
  const pick = (cells: Cell[]) => cells.filter(([r, c]) => ok(r, c));
  const uniq = (cells: Cell[]) => {
    const seen = new Set<string>();
    return cells.filter(([r, c]) => (seen.has(`${r},${c}`) ? false : (seen.add(`${r},${c}`), true)));
  };

  let out: Cell[] = [];
  switch (pattern) {
    case 'band': {
      // 가로 띠 한두 줄(두 줄이면 가운데를 두고 대칭)
      const r0 = rows[Math.min(rows.length - 1, Math.max(0, Math.floor(rows.length / 2) + rng.int(3) - 1))];
      const row = (r: number) => pick(Array.from({ length: w }, (_, c) => [r, c] as Cell));
      out = row(r0);
      if (out.length < n * 0.75 && rows.length > 2) {
        const mirror = Math.round(2 * cr - r0);
        out = out.concat(row(mirror === r0 ? r0 + 2 : mirror));
      }
      // 너무 길면 양 끝을 대칭으로 덜어 낸다
      while (out.length > n * 1.4) {
        const far = Math.max(...out.map(([, c]) => Math.abs(c - cc)));
        const trimmed = out.filter(([, c]) => Math.abs(c - cc) < far);
        if (trimmed.length === 0 || trimmed.length < n * 0.5) break;
        out = trimmed;
      }
      break;
    }
    case 'pillars': {
      // 좌우 대칭 기둥 두 개
      const c = rng.int(Math.max(1, Math.floor(w / 2) - 1)) + 1;
      const len = Math.max(2, Math.ceil(n / 2));
      const start = rows[Math.max(0, Math.floor((rows.length - len) / 2))] ?? 0;
      for (let r = start; r < start + len; r++) out.push([r, c], [r, w - 1 - c]);
      out = pick(out);
      break;
    }
    case 'frame': {
      // 가운데를 둘러싼 사각 테두리 - 크기는 n에 가장 가까운 것
      let best: Cell[] = [];
      for (let d = 1; d <= Math.floor(Math.min(w, h) / 2); d++) {
        const ring = free.filter(
          ([r, c]) => Math.max(Math.round(Math.abs(r - cr)), Math.round(Math.abs(c - cc))) === d,
        );
        if (Math.abs(ring.length - n) < Math.abs(best.length - n)) best = ring;
      }
      out = best;
      break;
    }
    case 'cluster': {
      // 덩어리(로얄매치의 4칸 큰 장애물 느낌): 적으면 가운데 하나, 많으면 좌우 대칭 둘
      const twin = n >= 6;
      const area = twin ? Math.ceil(n / 2) : n;
      const bw = Math.min(3, Math.max(2, Math.round(Math.sqrt(area))));
      const bh = Math.max(1, Math.ceil(area / bw));
      const r0 = rows[Math.floor(rng.next() * Math.max(1, rows.length - bh + 1))] ?? 0;
      const c0 = twin ? rng.int(Math.max(1, Math.floor(w / 2) - bw + 1)) : Math.round(cc - (bw - 1) / 2);
      for (let r = r0; r < r0 + bh; r++) {
        for (let c = c0; c < c0 + bw; c++) {
          out.push([r, c]);
          if (twin) out.push([r, w - 1 - c]);
        }
      }
      out = pick(uniq(out));
      break;
    }
    case 'diagonal': {
      // X자(구역 가운데 기준 두 대각선)
      for (const r of rows) {
        const d = r - cr;
        out.push([r, Math.round(cc + d)], [r, Math.round(cc - d)]);
      }
      out = pick(uniq(out));
      if (out.length > n * 1.6) out = out.filter(([r]) => Math.abs(r - cr) <= Math.ceil(n / 4));
      break;
    }
    case 'checker': {
      // 가운데 사각 영역 안의 체크무늬
      const half = Math.ceil(Math.sqrt(n * 2) / 2);
      out = free.filter(([r, c]) => Math.abs(r - cr) <= half && Math.abs(c - cc) <= half && (r + c) % 2 === 0);
      break;
    }
    case 'bottom':
    case 'top': {
      // 아래(또는 위)부터 줄 단위로 채운다 - 잡초 밭·꿀 지붕 같은 느낌
      const order = pattern === 'bottom' ? [...rows].reverse() : rows;
      for (const r of order) {
        if (out.length >= n) break;
        out = out.concat(pick(Array.from({ length: w }, (_, c) => [r, c] as Cell)));
      }
      break;
    }
    case 'guard': {
      // 목표물 상하좌우를 감싼다. 위쪽(보석이 내려오는 쪽)부터 채운다
      const around: Cell[] = [];
      anchor.forEach(([r, c]) => {
        for (const [dr, dc] of [[-1, 0], [0, -1], [0, 1], [1, 0]]) around.push([r + dr, c + dc]);
      });
      out = pick(uniq(around)).sort((a, b) => a[0] - b[0]);
      if (out.length > n * 1.7) out = out.slice(0, Math.ceil(n * 1.5));
      break;
    }
    case 'mirror':
      break;
    case 'scatter': {
      const pool = free.slice();
      for (let i = 0; i < n && pool.length > 0; i++) out.push(pool.splice(rng.int(pool.length), 1)[0]);
      return out;
    }
  }

  if (out.length >= Math.max(1, n * 0.5) && out.length <= Math.max(2, n * 1.7)) return out;

  // 대칭 흩뿌리기: 한 칸을 고르면 좌우 짝도 같이
  const pool = free.slice();
  const res: Cell[] = [];
  const taken = new Set<string>();
  while (res.length < n && pool.length > 0) {
    const [r, c] = pool.splice(rng.int(pool.length), 1)[0];
    if (taken.has(`${r},${c}`)) continue;
    res.push([r, c]);
    taken.add(`${r},${c}`);
    const mc = w - 1 - c;
    if (mc !== c && ok(r, mc) && !taken.has(`${r},${mc}`)) {
      res.push([r, mc]);
      taken.add(`${r},${mc}`);
    }
  }
  return res;
}

/** 구역이 덮는 줄 범위 */
export function zoneRows(zone: Zone, h: number): { from: number; to: number } {
  const third = Math.max(2, Math.round(h / 3));
  switch (zone) {
    case 'top':
      return { from: 1, to: third };
    case 'middle':
      return { from: third - 1, to: h - third };
    case 'bottom':
      return { from: h - 1 - third, to: h - 1 };
    default:
      return { from: 1, to: h - 1 };
  }
}

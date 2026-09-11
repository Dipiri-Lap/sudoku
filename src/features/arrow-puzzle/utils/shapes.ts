/**
 * 모양(실루엣) 스테이지에 쓰는 마스크 정의.
 *
 * 새 모양을 추가하려면 SHAPES 에 한 줄 넣으면 된다.
 * 판정 함수는 정규화 좌표를 받는다 — 가운데가 (0,0), 가장자리가 ±1, y 는 아래가 양수.
 * 반환값이 true 인 칸만 판에 포함된다.
 *
 * 추가한 뒤에는 반드시 미리보기로 실루엣을 확인할 것:
 *   npx tsx scripts/preview-arrow-shapes.ts
 */

export type Mask = [number, number][];

export interface MaskShape {
  name: string;
  /** 정규화 좌표 (x, y ∈ [-1, 1]) 에서 이 칸이 모양 안쪽인지 */
  inside: (x: number, y: number) => boolean;
  /**
   * 이 크기 미만의 판에서는 쓰지 않는다.
   * 칸이 적으면 복잡한 실루엣은 뭉개져서 뭘 그린 건지 알아볼 수 없다.
   */
  minSide?: number;
}

export const SHAPES: MaskShape[] = [
  { name: '원', inside: (x, y) => Math.hypot(x, y) <= 1 },
  { name: '마름모', inside: (x, y) => Math.abs(x) + Math.abs(y) <= 1 },
  { name: '십자', inside: (x, y) => Math.abs(x) <= 0.38 || Math.abs(y) <= 0.38 },
  { name: '모래시계', inside: (x, y) => Math.abs(x) <= 0.25 + 0.75 * Math.abs(y) },
  { name: '나비', inside: (x, y) => Math.abs(y) <= 0.25 + 0.75 * Math.abs(x) },
  { name: '고리', inside: (x, y) => { const d = Math.hypot(x, y); return d <= 1 && d >= 0.42; }, minSide: 12 },
  {
    name: '별',
    inside: (x, y) => Math.hypot(x, y) <= 0.55 + 0.45 * Math.abs(Math.cos(2.5 * Math.atan2(y, x))),
    minSide: 12,
  },
  {
    name: '하트',
    inside: (x, y) => {
      const yy = -y * 1.05 + 0.28;
      return Math.pow(x * x + yy * yy - 0.42, 3) - x * x * yy * yy * 0.9 <= 0;
    },
    minSide: 12,
  },
  {
    name: '삼각형',
    inside: (x, y) => y >= -0.85 && y <= 0.85 && Math.abs(x) <= (y + 0.85) * 0.62,
    minSide: 10,
  },
  {
    name: '초승달',
    inside: (x, y) => Math.hypot(x, y) <= 0.95 && Math.hypot(x - 0.42, y) > 0.78,
    minSide: 12,
  },
  {
    name: '물방울',
    inside: (x, y) => {
      const yy = y * 0.95;
      // 아래는 둥글고 위로 갈수록 뾰족해진다
      return Math.hypot(x, yy - 0.28) <= 0.62 || (yy < 0.28 && Math.abs(x) <= 0.62 * (yy + 0.85) / 1.13);
    },
    minSide: 12,
  },
];

/** 정규화 좌표 판정을 격자 칸 목록으로 바꾼다. */
export function buildMask(shape: MaskShape, cols: number, rows: number): Mask {
  const out: Mask = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) / (cols / 2);
      const y = (r - (rows - 1) / 2) / (rows / 2);
      if (shape.inside(x, y)) out.push([c, r]);
    }
  }
  return out;
}

/** 마스크를 바운딩 박스에 맞춰 잘라 격자를 꽉 채운다. */
export function fitMask(mask: Mask): { mask: Mask; cols: number; rows: number } {
  if (mask.length === 0) return { mask, cols: 1, rows: 1 };
  const cs = mask.map(([c]) => c);
  const rs = mask.map(([, r]) => r);
  const minC = Math.min(...cs), maxC = Math.max(...cs);
  const minR = Math.min(...rs), maxR = Math.max(...rs);
  return {
    mask: mask.map(([c, r]) => [c - minC, r - minR] as [number, number]),
    cols: maxC - minC + 1,
    rows: maxR - minR + 1,
  };
}

/**
 * 4-연결 덩어리 개수. 덩어리가 여럿이면 각각 따로 채워지므로 레벨은 만들어지지만,
 * 조각난 실루엣은 대개 의도한 그림이 아니다.
 */
export function componentCount(mask: Mask): number {
  const set = new Set(mask.map(([c, r]) => `${c},${r}`));
  const seen = new Set<string>();
  let n = 0;
  for (const [c0, r0] of mask) {
    const key = `${c0},${r0}`;
    if (seen.has(key)) continue;
    n++;
    const queue: Mask = [[c0, r0]];
    seen.add(key);
    while (queue.length) {
      const [c, r] = queue.pop()!;
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]] as Mask) {
        const nk = `${nc},${nr}`;
        if (set.has(nk) && !seen.has(nk)) { seen.add(nk); queue.push([nc, nr]); }
      }
    }
  }
  return n;
}

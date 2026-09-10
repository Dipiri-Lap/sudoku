// 임의 모양(실루엣) 마스크 생성.
//
// 캔버스에 글자/이모지/이미지를 그린 뒤 각 격자 칸의 알파 커버리지를 재서
// "이 칸이 판에 포함되는가"를 결정한다. 결과는 [col, row] 목록.

export type MaskCells = [number, number][];

const SS = 8; // 칸당 슈퍼샘플 해상도 (SS x SS 픽셀을 평균)

export interface MaskOptions {
  /** 칸이 채워진 것으로 볼 알파 커버리지 임계값 (0~1) */
  threshold?: number;
  /** 격자 대비 모양이 차지할 비율 (0~1) */
  fill?: number;
  /** 이 크기보다 작은 연결 덩어리는 버린다 (점 노이즈 제거) */
  minComponent?: number;
  /** 마스크를 격자에 꽉 차도록 이동시킬지 */
  trim?: boolean;
}

const DEFAULTS: Required<MaskOptions> = {
  threshold: 0.42,
  fill: 0.94,
  minComponent: 3,
  trim: true,
};

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

/** 알파 채널을 칸 단위로 샘플링해 마스크로 변환한다. */
function sampleAlpha(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  threshold: number
): MaskCells {
  const { data } = ctx.getImageData(0, 0, cols * SS, rows * SS);
  const rowStride = cols * SS * 4;
  const cells: MaskCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let y = 0; y < SS; y++) {
        const base = (r * SS + y) * rowStride + c * SS * 4;
        for (let x = 0; x < SS; x++) sum += data[base + x * 4 + 3];
      }
      if (sum / (SS * SS * 255) >= threshold) cells.push([c, r]);
    }
  }
  return cells;
}

/** 4-연결 덩어리 중 minComponent 미만인 것을 제거한다. */
export function pruneSmallComponents(cells: MaskCells, minSize: number): MaskCells {
  if (minSize <= 1) return cells;
  const set = new Set(cells.map(([c, r]) => `${c},${r}`));
  const seen = new Set<string>();
  const kept: MaskCells = [];

  for (const cell of cells) {
    const key = `${cell[0]},${cell[1]}`;
    if (seen.has(key)) continue;
    // BFS로 한 덩어리 수집
    const comp: MaskCells = [];
    const queue: MaskCells = [cell];
    seen.add(key);
    while (queue.length) {
      const [c, r] = queue.pop()!;
      comp.push([c, r]);
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]] as MaskCells) {
        const nk = `${nc},${nr}`;
        if (set.has(nk) && !seen.has(nk)) { seen.add(nk); queue.push([nc, nr]); }
      }
    }
    if (comp.length >= minSize) kept.push(...comp);
  }
  return kept;
}

/** 마스크를 바운딩 박스 기준으로 격자 가운데에 맞춘다. */
export function centerMask(cells: MaskCells, cols: number, rows: number): MaskCells {
  if (cells.length === 0) return cells;
  const cs = cells.map(([c]) => c), rs = cells.map(([, r]) => r);
  const minC = Math.min(...cs), maxC = Math.max(...cs);
  const minR = Math.min(...rs), maxR = Math.max(...rs);
  const dc = Math.floor((cols - 1 - maxC - minC) / 2);
  const dr = Math.floor((rows - 1 - maxR - minR) / 2);
  return cells.map(([c, r]) => [c + dc, r + dr] as [number, number]);
}

/**
 * 글자/이모지를 격자 마스크로 변환한다.
 * 예: maskFromText('A', 14, 16) → 알파벳 A 모양의 칸 목록
 */
export function maskFromText(
  text: string,
  cols: number,
  rows: number,
  font = '900 100px "Arial Black", Arial, sans-serif',
  options: MaskOptions = {}
): MaskCells {
  const opt = { ...DEFAULTS, ...options };
  const W = cols * SS, H = rows * SS;
  const ctx = makeCanvas(W, H).getContext('2d');
  if (!ctx) return [];

  const PROBE = 100;
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const m = ctx.measureText(text);
  const bw = (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? m.width);
  const bh = (m.actualBoundingBoxAscent ?? PROBE) + (m.actualBoundingBoxDescent ?? 0);
  if (bw <= 0 || bh <= 0) return [];

  const scale = Math.min((W * opt.fill) / bw, (H * opt.fill) / bh);
  ctx.font = font.replace(/(\d+(?:\.\d+)?)px/, `${PROBE * scale}px`);

  const m2 = ctx.measureText(text);
  const bw2 = (m2.actualBoundingBoxLeft ?? 0) + (m2.actualBoundingBoxRight ?? m2.width);
  const bh2 = (m2.actualBoundingBoxAscent ?? 0) + (m2.actualBoundingBoxDescent ?? 0);
  const x = (W - bw2) / 2 + (m2.actualBoundingBoxLeft ?? 0);
  const y = (H - bh2) / 2 + (m2.actualBoundingBoxAscent ?? 0);

  ctx.fillStyle = '#000';
  ctx.fillText(text, x, y);

  let cells = sampleAlpha(ctx, cols, rows, opt.threshold);
  cells = pruneSmallComponents(cells, opt.minComponent);
  return opt.trim ? centerMask(cells, cols, rows) : cells;
}

/**
 * 이미지(PNG 실루엣 등)를 격자 마스크로 변환한다.
 * 알파가 있으면 알파를, 불투명 이미지면 밝기를 기준으로 삼는다.
 */
export function maskFromImage(
  img: HTMLImageElement,
  cols: number,
  rows: number,
  options: MaskOptions & { useLuminance?: boolean } = {}
): MaskCells {
  const opt = { ...DEFAULTS, ...options };
  const W = cols * SS, H = rows * SS;
  const ctx = makeCanvas(W, H).getContext('2d');
  if (!ctx) return [];

  const scale = Math.min((W * opt.fill) / img.width, (H * opt.fill) / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  if (options.useLuminance) {
    // 어두운 픽셀을 채워진 것으로 보고 알파로 옮겨 담는다.
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      d[i + 3] = d[i + 3] > 0 && lum < 0.6 ? 255 : 0;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  let cells = sampleAlpha(ctx, cols, rows, opt.threshold);
  cells = pruneSmallComponents(cells, opt.minComponent);
  return opt.trim ? centerMask(cells, cols, rows) : cells;
}

/**
 * 마스크의 바운딩 박스에 맞춰 격자를 잘라낸다.
 * 참고 레퍼런스처럼 모양이 화면을 꽉 채우게 하려면 생성 직전에 한 번 통과시킨다.
 */
export function fitGridToMask(cells: MaskCells): { mask: MaskCells; cols: number; rows: number } {
  if (cells.length === 0) return { mask: cells, cols: 1, rows: 1 };
  const cs = cells.map(([c]) => c), rs = cells.map(([, r]) => r);
  const minC = Math.min(...cs), maxC = Math.max(...cs);
  const minR = Math.min(...rs), maxR = Math.max(...rs);
  return {
    mask: cells.map(([c, r]) => [c - minC, r - minR] as [number, number]),
    cols: maxC - minC + 1,
    rows: maxR - minR + 1,
  };
}

/** 브라우저에 실제로 설치된 폰트만 골라 쓰기 위한 후보 목록 */
export const SHAPE_PRESETS: { label: string; text: string }[] = [
  { label: 'A', text: 'A' }, { label: 'B', text: 'B' }, { label: 'C', text: 'C' },
  { label: 'S', text: 'S' }, { label: 'Z', text: 'Z' }, { label: '8', text: '8' },
  { label: '하트', text: '♥' }, { label: '별', text: '★' }, { label: '달', text: '☾' },
  { label: '체크', text: '✓' }, { label: '음표', text: '♪' }, { label: '우산', text: '☂' },
];

import type { TurnStep } from '../../engine/resolve';
import { blastArea, type Blast } from '../../engine/specials';
import { key, parseKey } from '../../engine/board';

/**
 * 이펙트 시각표.
 *
 * 한 "터짐" 단계 안에서 칸마다 **언제** 사라질지를 정한다. 엔진은 무엇이
 * 터지는지만 알려주고(규칙), 언제 어떤 순서로 보일지는 여기서 정한다(연출).
 * 칸이 동시에 사라지지 않고 물결처럼 사라져야 아이템마다 다른 모양이 읽힌다.
 *
 * 판 위의 칸(DOM)과 이펙트 층(Pixi)이 이 한 표를 같이 본다 - 둘이 따로
 * 시간을 재면 삽이 지나가기 전에 칸이 먼저 사라지는 어긋남이 생긴다.
 */
export const FX_TIMING = {
  /** 거름포대: 부풀며 떠는 예비 동작. "터질 듯 말 듯"이 보이도록 길게(갈수록 격해진다) */
  tntCharge: 520,
  /** 거름포대: 터지기 직전 멈칫(히트스톱) */
  tntHitstop: 80,
  /** 거름포대: 충격파가 한 칸 퍼지는 시간 */
  tntRing: 55,
  /** 삽: 떠나기까지 */
  rocketLaunch: 70,
  /** 삽: 한 칸 지나가는 시간 */
  rocketCell: 36,
  /** 도토리: 웅크렸다 튀어 오르기까지(이때 주변 십자가 튕겨 나간다) */
  acornLaunch: 230,
  /** 도토리: 비행 기본 + 한 칸당 */
  acornFlyBase: 380,
  acornFlyCell: 62,
  /** 제비: 갈라져 떠나기까지 */
  swallowTakeoff: 170,
  swallowFlyBase: 300,
  swallowFlyCell: 52,
  /** 개구리: 움츠리기 */
  frogCrouch: 200,
  /** 개구리: 점프 기본 + 한 칸당 */
  frogHopBase: 440,
  frogHopCell: 55,
  /** 개구리: 착지 충격이 한 칸 퍼지는 시간 */
  frogRing: 45,
  /** 허수아비: 땅에서 불쑥 솟아 팔을 벌리기까지 */
  scarecrowRise: 160,
  /** 허수아비: 팔 끝에서 뻗는 바람이 한 칸 가는 시간 */
  scarecrowCell: 38,
  /** 허수아비: 솟은 뒤 까마귀가 놀라 달아나기까지 */
  scarecrowScare: 120,
  /** 합체(삽 십자): 두 삽이 X자로 "쨍" 부딪히는 시간 - 네 방향으로 튀어나가기 전 */
  crossClash: 260,
  /** 합체(삽+거름포대): 포대가 부풀다 펑 터지기까지 - 그 폭발 속에서 큰 삽 네 자루가 나간다 */
  crossBoom: 380,
  /** 합체(도토리 떼): 도토리끼리 출발 시차 */
  swarmGap: 110,
  /** 무지개꽃: 빙글 돌며 떠올라 활짝 피기까지 */
  lightRise: 240,
  /** 무지개꽃: 빛 한 줄기를 뿌리는 간격 - 하나씩 천천히 보이게 */
  lightGap: 170,
  /** 무지개꽃: 뿌리는 시간의 상한(같은 색이 아주 많을 때 간격을 좁혀 이 안에 다 뿌린다) */
  lightSpreadMax: 1300,
  /** 무지개꽃: 한 줄기가 날아가 닿는 시간 */
  lightFly: 380,
  /** 무지개꽃 변신 합체: 다 바뀐 뒤 바뀐 아이템이 하나씩 터지는 간격 */
  transformGap: 200,
  /** 무지개꽃: 다 뻗은 뒤 한꺼번에 팡 터지기 전 잠깐 */
  lightHold: 110,
  /** 마지막 칸이 사라진 뒤 낙하 전까지 아주 잠깐 숨 고르기 */
  settle: 40,
} as const;

const FLYERS = new Set<Blast['kind']>(['propeller', 'butterfly', 'ladybug']);

/** 무지개꽃이 빛을 뿌리는 간격: 기본 lightGap, 대상이 많으면 상한 안에 들도록 좁힌다 */
export function lightGapFor(n: number): number {
  if (n <= 1) return 0;
  return Math.min(FX_TIMING.lightGap, FX_TIMING.lightSpreadMax / (n - 1));
}

/** 무지개꽃: 대상 n개에 빛을 하나씩 다 뿌리고 같은 색이 한꺼번에 팡 터지는 시각(발동 기준) */
export function lightballPopMs(n: number): number {
  return FX_TIMING.lightRise + Math.max(0, n - 1) * lightGapFor(n) + FX_TIMING.lightFly + FX_TIMING.lightHold;
}

/** 이 종류는 전용 이펙트가 있다. 나머지는 기존처럼 한 번에 사라진다. */
export function hasFx(kind: Blast['kind']): boolean {
  return (
    kind === 'tnt' ||
    kind === 'rocket-h' ||
    kind === 'rocket-v' ||
    kind === 'scarecrow' ||
    kind === 'lightball' ||
    FLYERS.has(kind)
  );
}

/**
 * 이 발동에 전용 이펙트를 붙일지.
 * 도토리·제비·개구리는 날아갈 목적지가 있어야 하고, 합체 폭발(다른 아이템을 싣고 가는 등)은
 * 범위가 달라서 기존처럼 한 번에 터뜨린다.
 */
export function blastHasFx(b: Blast): boolean {
  if (!hasFx(b.kind)) return false;
  // 무지개꽃은 색을 지목했을 때만(빛줄기를 뻗을 대상이 있어야 한다). 합체는 변신 합체만
  if (b.kind === 'lightball') {
    if (b.combo) return !!b.into;
    return b.targetColor !== null && b.targetColor !== undefined;
  }
  if (!FLYERS.has(b.kind)) return true;
  // 합체에서 날아가는 건 언제나 도토리다(떼로 날기·실어 나르기). 제비·개구리 모양의
  // 합체 발동은 만들어지지 않지만, 혹시 오면 기존처럼 한 번에 터뜨린다.
  if (b.combo && b.kind !== 'propeller') return false;
  return flightTargets(b).length > 0;
}

/** 날아가는 아이템의 목적지들(도토리는 하나, 제비는 둘, 개구리는 하나) */
export function flightTargets(b: Blast): { row: number; col: number }[] {
  if (b.kind === 'propeller') {
    const d = b.destination;
    return d && (d.row !== b.row || d.col !== b.col) ? [d] : [];
  }
  return b.destinations ?? [];
}

/** 출발 칸에서 목적지까지 거리(칸) */
export function cellDist(b: Blast, t: { row: number; col: number }): number {
  return Math.hypot(t.row - b.row, t.col - b.col);
}

/** 발동부터 목적지에 닿기까지(ms). FxLayer도 이 값으로 날려서 칸과 어긋나지 않는다. */
export function arrivalMs(b: Blast, t: { row: number; col: number }): number {
  const d = cellDist(b, t);
  switch (b.kind) {
    case 'propeller':
      return FX_TIMING.acornLaunch + FX_TIMING.acornFlyBase + d * FX_TIMING.acornFlyCell;
    case 'butterfly':
      return FX_TIMING.swallowTakeoff + FX_TIMING.swallowFlyBase + d * FX_TIMING.swallowFlyCell;
    case 'ladybug':
      return FX_TIMING.frogCrouch + FX_TIMING.frogHopBase + d * FX_TIMING.frogHopCell;
    default:
      return 0;
  }
}

export interface ScheduledBlast {
  blast: Blast;
  /** 이 아이템이 발동하는 시각(ms, 단계 시작 기준) */
  start: number;
  /** 합체로 도토리가 실어 나르는 아이템(도토리 쪽에만). 도토리 발밑에 매달아 그린다 */
  payload?: Blast['kind'];
  /** 십자 합체(삽+삽 등)의 삽: 출발 전에 X자로 부딪히는 연출을 한다(start에 이미 그 시간이 들어 있다) */
  clash?: boolean;
  /** 도토리가 실어 와서 목적지에서 터지는 아이템인가 */
  carried?: boolean;
}

export interface ClearSchedule {
  /** 칸 → 사라지기 시작하는 시각 */
  delays: Map<string, number>;
  /** 무지개꽃 변신 합체: 칸 → 꽃잎이 닿아 아이템으로 바뀌는 시각 */
  morphAt: Map<string, number>;
  blasts: ScheduledBlast[];
  /** 가장 늦게 맞는 칸의 시각 */
  lastHit: number;
}

const EMPTY: ClearSchedule = { delays: new Map(), morphAt: new Map(), blasts: [], lastHit: 0 };

/** 무지개꽃 변신 합체 표시인가(칸을 직접 지우지 않고 아이템으로 바꾸기만 한다) */
function isMorph(b: Blast): boolean {
  return b.kind === 'lightball' && !!b.combo && !!b.into;
}

/**
 * 무지개꽃 변신 합체가 바꾸는 칸들(합체 자리 빼고), 가까운 것부터. 꽃잎을 뿌리는 순서이자
 * 다 바뀐 뒤 터지는 순서다 - 연출(FxLayer)과 시간표가 같은 순서를 쓴다.
 */
export function transformTargets(step: TurnStep, b: Blast): string[] {
  if (step.kind !== 'clear' || !b.into) return [];
  const want = b.into === 'rocket-h' || b.into === 'rocket-v' ? ['rocket-h', 'rocket-v'] : [b.into];
  return step.cells
    .filter(k => {
      const { row, col } = parseKey(k);
      if (row === b.row && col === b.col) return false;
      const g = step.board.cells[row * step.board.width + col]?.gem;
      return !!g?.special && want.includes(g.special);
    })
    .map(k => ({ k, ...parseKey(k) }))
    .sort((u, v) => Math.hypot(u.row - b.row, u.col - b.col) - Math.hypot(v.row - b.row, v.col - b.col) || (u.k < v.k ? -1 : 1))
    .map(x => x.k);
}

/**
 * 아이템이 발동한 뒤 그 칸이 맞기까지 걸리는 시간. 닿지 않으면 Infinity.
 * 아이템 자기 칸은 0이다 - 자기 칸의 예비 동작은 CSS 애니메이션이 맡는다.
 */
export function localDelay(blast: Blast, row: number, col: number): number {
  const dr = row - blast.row;
  const dc = col - blast.col;
  if (dr === 0 && dc === 0) return 0;
  switch (blast.kind) {
    case 'tnt':
      return FX_TIMING.tntCharge + FX_TIMING.tntHitstop + Math.max(Math.abs(dr), Math.abs(dc)) * FX_TIMING.tntRing;
    case 'lightball':
      // 대상 수를 모를 때의 기본(한 줄기). 실제 시각은 scheduleClear가 대상 수로 다시 잰다
      return lightballPopMs(1);
    case 'rocket-h':
      // 합체로 띠가 두꺼워져도(3줄) 같은 삽이 지나가는 것으로 본다
      return Math.abs(dr) <= 1 ? FX_TIMING.rocketLaunch + Math.abs(dc) * FX_TIMING.rocketCell : Infinity;
    case 'rocket-v':
      return Math.abs(dc) <= 1 ? FX_TIMING.rocketLaunch + Math.abs(dr) * FX_TIMING.rocketCell : Infinity;
    case 'scarecrow':
      // 같은 줄은 바람이 팔 끝에서 차례로 쓸고, 그 밖은 까마귀(한꺼번에 놀란다)
      if (dr === 0 || dc === 0) return FX_TIMING.scarecrowRise + (Math.abs(dr) + Math.abs(dc)) * FX_TIMING.scarecrowCell;
      return FX_TIMING.scarecrowRise + FX_TIMING.scarecrowScare;
    case 'propeller': {
      // 떠오르는 날갯바람이 주변 십자를 날리고, 목적지는 도토리가 쪼는 순간
      let best = Infinity;
      if (Math.abs(dr) + Math.abs(dc) === 1) best = FX_TIMING.acornLaunch * 0.5;
      flightTargets(blast).forEach(t => {
        if (t.row === row && t.col === col) best = Math.min(best, arrivalMs(blast, t));
      });
      return best;
    }
    case 'butterfly': {
      let best = Infinity;
      flightTargets(blast).forEach(t => {
        if (t.row === row && t.col === col) best = Math.min(best, arrivalMs(blast, t));
      });
      return best;
    }
    case 'ladybug': {
      let best = Infinity;
      flightTargets(blast).forEach(t => {
        const ring = Math.max(Math.abs(row - t.row), Math.abs(col - t.col));
        if (ring <= 1) best = Math.min(best, arrivalMs(blast, t) + ring * FX_TIMING.frogRing);
      });
      return best;
    }
    default:
      return 0;
  }
}

const cache = new WeakMap<TurnStep, ClearSchedule>();

export function scheduleClear(step: TurnStep): ClearSchedule {
  if (step.kind !== 'clear') return EMPTY;
  const hit = cache.get(step);
  if (hit) return hit;

  const blasts = step.blasts;
  const n = blasts.length;
  // 합체 폭발은 범위가 개별 발동과 달라서(십자 3줄, 반경 4) 표준 범위 대신
  // "이번에 사라지는 칸 전부"를 후보로 보고 거리로만 시간을 잰다.
  const areas: Set<string>[] = blasts.map(b =>
    b.combo
      ? new Set(step.cells)
      : new Set(
          blastArea(step.board, b.row, b.col, b.kind, b.targetColor ?? null, b.destination ?? null, b.destinations ?? []),
        ),
  );

  // 발동 시각: 다른 아이템 범위 안에 있던 아이템은 그 물결이 닿은 순간 터진다.
  const start = new Array<number>(n).fill(Infinity);
  const originOf = (i: number) => key(blasts[i].row, blasts[i].col);
  for (let i = 0; i < n; i++) {
    // 합체 폭발도 덮는다: 합체 단계에서는 합체 말고 처음부터 터지는 아이템이 없다 - 나머지는 모두
    // 합체 폭발이 닿아서 터진 것이다. 빼면 큰 거름포대(포대+포대) 범위의 도토리가 포대가 부풀기도
    // 전에(0초) 먼저 날아갔다. 실제로 닿는 범위(시각이 정해지는 칸)만 덮는 것으로 본다.
    const covered = blasts.some((_, j) => {
      if (j === i || !areas[j].has(originOf(i))) return false;
      // 무지개꽃 변신 합체 표시는 칸을 직접 지우지 않는다(바뀐 아이템들이 지운다) - 덮는 폭발이 아니다
      if (isMorph(blasts[j])) return false;
      if (!blasts[j].combo) return true;
      return Number.isFinite(localDelay(blasts[j], blasts[i].row, blasts[i].col));
    });
    if (!covered || blasts[i].combo) start[i] = 0;
  }
  // 서로가 서로를 덮는 경우(같은 줄의 로켓 둘 등) 아무도 0이 아니면 첫 번째를 뿌리로 삼는다.
  if (n > 0 && start.every(s => s === Infinity)) start[0] = 0;

  // 합체 연출:
  //  - 도토리 떼(도토리+도토리): 한꺼번에 뜨면 겹쳐 보여서 한 마리씩 시차를 둔다.
  //  - 실어 나르기(도토리+다른 아이템): 실린 아이템은 도토리가 목적지에 닿는 순간 터진다.
  //    엔진은 둘을 같은 단계에 함께 내놓으므로, 순서는 여기서 정한다.
  const payloadOf = new Map<number, Blast['kind']>();
  const carried = new Set<number>();
  let flock = 0;
  for (let i = 0; i < n; i++) {
    const f = blasts[i];
    if (!f.combo || f.kind !== 'propeller' || !f.destination) continue;
    const d = f.destination;
    const j = blasts.findIndex((p, k) => k !== i && p.combo && p.kind !== 'propeller' && p.row === d.row && p.col === d.col);
    if (j >= 0) {
      start[j] = start[i] + arrivalMs(f, d);
      carried.add(j);
      payloadOf.set(i, blasts[j].kind);
    } else {
      start[i] += flock * FX_TIMING.swarmGap;
      flock++;
    }
  }
  // 십자 합체: 같은 자리에서 나가는 가로·세로 삽 한 쌍(실려 온 것 말고)은 먼저 X자로 부딪힌다
  const clash = new Set<number>();
  for (let i = 0; i < n; i++) {
    const h = blasts[i];
    if (!h.combo || h.kind !== 'rocket-h' || carried.has(i)) continue;
    const j = blasts.findIndex((v, k) => k !== i && v.combo && v.kind === 'rocket-v' && !carried.has(k) && v.row === h.row && v.col === h.col);
    if (j < 0) continue;
    // 삽+삽은 X자 쨍, 삽+거름포대(두꺼운 십자)는 포대 폭발 - 기다리는 시간이 다르다
    const wait = (h.band ?? 1) > 1 ? FX_TIMING.crossBoom : FX_TIMING.crossClash;
    start[i] += wait;
    start[j] += wait;
    clash.add(i);
    clash.add(j);
  }
  // 무지개꽃 변신 합체: 꽃잎이 하나씩 닿아 아이템으로 바뀌고, 다 바뀐 뒤 가까운 것부터 차례로 터진다
  const morphAt = new Map<string, number>();
  const fixed = new Set<number>();
  blasts.forEach((tb, j) => {
    if (!(tb.kind === 'lightball' && tb.combo && tb.into)) return;
    const order = transformTargets(step, tb);
    const gap = lightGapFor(order.length);
    order.forEach((k, idx) => morphAt.set(k, start[j] + FX_TIMING.lightRise + idx * gap + FX_TIMING.lightFly));
    const placed = start[j] + lightballPopMs(order.length);
    order.forEach((k, idx) => {
      const i = blasts.findIndex(b2 => !b2.combo && key(b2.row, b2.col) === k);
      if (i < 0) return;
      start[i] = placed + idx * FX_TIMING.transformGap;
      fixed.add(i);
    });
  });
  for (let changed = true, guard = 0; changed && guard < n + 2; guard++) {
    changed = false;
    for (let j = 0; j < n; j++) {
      if (start[j] === Infinity || isMorph(blasts[j])) continue;
      for (let i = 0; i < n; i++) {
        if (i === j || !areas[j].has(originOf(i))) continue;
        // 합체가 정한 시각(도토리 떼 시차, 실린 아이템, 변신 순서)은 물결이 덮어쓰지 않는다
        if (blasts[i].combo || fixed.has(i)) continue;
        const t = start[j] + (blastHasFx(blasts[j]) ? localDelay(blasts[j], blasts[i].row, blasts[i].col) : 0);
        if (t < start[i]) {
          start[i] = t;
          changed = true;
        }
      }
    }
  }
  for (let i = 0; i < n; i++) if (start[i] === Infinity) start[i] = 0;

  // 무지개꽃이 빛을 뿌릴 대상 수(연출 FxLayer.spawnRainbow와 같은 기준)
  const lightCount = (i: number) => {
    const b = blasts[i];
    return step.cells.filter(k => {
      if (k === originOf(i)) return false;
      const { row, col } = parseKey(k);
      const g = step.board.cells[row * step.board.width + col]?.gem;
      return !!g && !g.special && !g.inert && g.color === b.targetColor;
    }).length;
  };
  const delays = new Map<string, number>();
  const targets = new Set([...step.cells, ...step.damage.map(d => d.key)]);
  let lastHit = 0;
  targets.forEach(k => {
    let best = Infinity;
    const { row, col } = parseKey(k);
    for (let i = 0; i < n; i++) {
      if (!areas[i].has(k)) continue;
      if (carried.has(i)) {
        // 실린 아이템: 도토리가 닿기 전에는 아무것도 사라지지 않는다.
        // 전용 이펙트가 있으면 그 퍼짐을 따르고, 없으면 도착 순간 한꺼번에.
        const ld = blastHasFx(blasts[i]) ? localDelay(blasts[i], row, col) : 0;
        best = Math.min(best, start[i] + (Number.isFinite(ld) ? ld : 0));
        continue;
      }
      if (!blastHasFx(blasts[i])) continue;
      if (blasts[i].kind === 'lightball') {
        // 변신 합체는 칸을 직접 지우지 않는다 - 바뀐 아이템이 제 차례에 터진다
        if (blasts[i].combo) continue;
        best = Math.min(best, start[i] + lightballPopMs(lightCount(i)));
        continue;
      }
      best = Math.min(best, start[i] + localDelay(blasts[i], row, col));
    }
    const d = best === Infinity ? 0 : best;
    delays.set(k, d);
    lastHit = Math.max(lastHit, d);
  });

  // 날아가서 직접 치는 칸(장애물 등): 지워지는 범위에 안 잡혀 시각이 0으로 남는다.
  // 첫 도착 시각을 그 칸의 시각으로 두고, 단계는 마지막 도착까지 기다린다 - 안 그러면
  // 도토리 떼가 돌에 닿기도 전에 다음 단계(낙하)로 넘어가 돌이 미리 사라졌다.
  const firstArrival = new Map<string, number>();
  blasts.forEach((b, i) => {
    if (!blastHasFx(b)) return;
    flightTargets(b).forEach(t => {
      const k = `${t.row},${t.col}`;
      if (!targets.has(k)) return;
      const arrive = start[i] + arrivalMs(b, t);
      firstArrival.set(k, Math.min(firstArrival.get(k) ?? Infinity, arrive));
      lastHit = Math.max(lastHit, arrive);
    });
  });
  firstArrival.forEach((t, k) => {
    if ((delays.get(k) ?? 0) === 0) delays.set(k, t);
  });

  // 옆 칸이 지워져서 깎이는 장애물: 어느 폭발 범위에도 안 잡혀 시각이 0으로 남는다.
  // 옆 칸(이번에 지워지는 칸)이 사라지는 가장 이른 시각에 깎이게 한다 - 안 그러면
  // 삽이 오기도 전에 짚단이 미리 사라졌다.
  const clearedSet = new Set(step.cells);
  step.damage.forEach(d => {
    if (clearedSet.has(d.key) || (delays.get(d.key) ?? 0) > 0) return;
    const { row, col } = parseKey(d.key);
    let best = Infinity;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
      const nk = `${row + dr},${col + dc}`;
      if (clearedSet.has(nk)) best = Math.min(best, delays.get(nk) ?? 0);
    });
    if (Number.isFinite(best) && best > 0) {
      delays.set(d.key, best);
      lastHit = Math.max(lastHit, best);
    }
  });

  const result: ClearSchedule = {
    delays,
    morphAt,
    blasts: blasts.map((blast, i) => ({
      blast,
      start: start[i],
      payload: payloadOf.get(i),
      carried: carried.has(i),
      ...(clash.has(i) ? { clash: true } : {}),
    })),
    lastHit,
  };
  cache.set(step, result);
  return result;
}

/**
 * 이펙트가 있는 터짐 단계의 길이. 없으면 0(기존 길이를 쓴다).
 *
 * 마지막 칸이 사라지는 애니메이션까지만 기다린다. 파편은 이펙트 층에서 계속
 * 날고 있으므로 낙하와 겹쳐도 된다 - 파편이 다 가라앉을 때까지 판을 멈춰 두면
 * 빈 칸만 덩그러니 남아 답답하다.
 */
export function clearStepMs(step: TurnStep, popMs: number): number {
  const s = scheduleClear(step);
  if (!s.blasts.some(b => blastHasFx(b.blast))) return 0;
  return s.lastHit + popMs + FX_TIMING.settle;
}

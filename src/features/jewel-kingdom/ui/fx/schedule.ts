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
  /** 거름포대: 부풀며 떠는 예비 동작 */
  tntCharge: 150,
  /** 거름포대: 터지기 직전 멈칫(히트스톱) */
  tntHitstop: 60,
  /** 거름포대: 충격파가 한 칸 퍼지는 시간 */
  tntRing: 55,
  /** 삽: 떠나기까지 */
  rocketLaunch: 70,
  /** 삽: 한 칸 지나가는 시간 */
  rocketCell: 36,
  /** 참새: 날개를 털며 떠오르기까지(이때 주변 십자가 바람에 날린다) */
  sparrowTakeoff: 230,
  /** 참새: 비행 기본 + 한 칸당 */
  sparrowFlyBase: 380,
  sparrowFlyCell: 62,
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
  /** 합체(참새 떼): 참새끼리 출발 시차 */
  swarmGap: 110,
  /** 마지막 칸이 사라진 뒤 낙하 전까지 아주 잠깐 숨 고르기 */
  settle: 40,
} as const;

const FLYERS = new Set<Blast['kind']>(['propeller', 'butterfly', 'ladybug']);

/** 이 종류는 전용 이펙트가 있다. 나머지는 기존처럼 한 번에 사라진다. */
export function hasFx(kind: Blast['kind']): boolean {
  return kind === 'tnt' || kind === 'rocket-h' || kind === 'rocket-v' || kind === 'scarecrow' || FLYERS.has(kind);
}

/**
 * 이 발동에 전용 이펙트를 붙일지.
 * 참새·제비·개구리는 날아갈 목적지가 있어야 하고, 합체 폭발(다른 아이템을 싣고 가는 등)은
 * 범위가 달라서 기존처럼 한 번에 터뜨린다.
 */
export function blastHasFx(b: Blast): boolean {
  if (!hasFx(b.kind)) return false;
  if (!FLYERS.has(b.kind)) return true;
  // 합체에서 날아가는 건 언제나 참새다(떼로 날기·실어 나르기). 제비·개구리 모양의
  // 합체 발동은 만들어지지 않지만, 혹시 오면 기존처럼 한 번에 터뜨린다.
  if (b.combo && b.kind !== 'propeller') return false;
  return flightTargets(b).length > 0;
}

/** 날아가는 아이템의 목적지들(참새는 하나, 제비는 둘, 개구리는 하나) */
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
      return FX_TIMING.sparrowTakeoff + FX_TIMING.sparrowFlyBase + d * FX_TIMING.sparrowFlyCell;
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
  /** 합체로 참새가 실어 나르는 아이템(참새 쪽에만). 참새 발밑에 매달아 그린다 */
  payload?: Blast['kind'];
  /** 참새가 실어 와서 목적지에서 터지는 아이템인가 */
  carried?: boolean;
}

export interface ClearSchedule {
  /** 칸 → 사라지기 시작하는 시각 */
  delays: Map<string, number>;
  blasts: ScheduledBlast[];
  /** 가장 늦게 맞는 칸의 시각 */
  lastHit: number;
}

const EMPTY: ClearSchedule = { delays: new Map(), blasts: [], lastHit: 0 };

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
      // 떠오르는 날갯바람이 주변 십자를 날리고, 목적지는 참새가 쪼는 순간
      let best = Infinity;
      if (Math.abs(dr) + Math.abs(dc) === 1) best = FX_TIMING.sparrowTakeoff * 0.5;
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
    const covered = blasts.some((_, j) => j !== i && !blasts[j].combo && areas[j].has(originOf(i)));
    if (!covered || blasts[i].combo) start[i] = 0;
  }
  // 서로가 서로를 덮는 경우(같은 줄의 로켓 둘 등) 아무도 0이 아니면 첫 번째를 뿌리로 삼는다.
  if (n > 0 && start.every(s => s === Infinity)) start[0] = 0;

  // 합체 연출:
  //  - 참새 떼(참새+참새): 한꺼번에 뜨면 겹쳐 보여서 한 마리씩 시차를 둔다.
  //  - 실어 나르기(참새+다른 아이템): 실린 아이템은 참새가 목적지에 닿는 순간 터진다.
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
  for (let changed = true, guard = 0; changed && guard < n + 2; guard++) {
    changed = false;
    for (let j = 0; j < n; j++) {
      if (start[j] === Infinity) continue;
      for (let i = 0; i < n; i++) {
        if (i === j || !areas[j].has(originOf(i))) continue;
        // 합체가 정한 시각(참새 떼 시차, 실린 아이템)은 물결이 덮어쓰지 않는다
        if (blasts[i].combo) continue;
        const t = start[j] + (blastHasFx(blasts[j]) ? localDelay(blasts[j], blasts[i].row, blasts[i].col) : 0);
        if (t < start[i]) {
          start[i] = t;
          changed = true;
        }
      }
    }
  }
  for (let i = 0; i < n; i++) if (start[i] === Infinity) start[i] = 0;

  const delays = new Map<string, number>();
  const targets = new Set([...step.cells, ...step.damage.map(d => d.key)]);
  let lastHit = 0;
  targets.forEach(k => {
    let best = Infinity;
    const { row, col } = parseKey(k);
    for (let i = 0; i < n; i++) {
      if (!areas[i].has(k)) continue;
      if (carried.has(i)) {
        // 실린 아이템: 참새가 닿기 전에는 아무것도 사라지지 않는다.
        // 전용 이펙트가 있으면 그 퍼짐을 따르고, 없으면 도착 순간 한꺼번에.
        const ld = blastHasFx(blasts[i]) ? localDelay(blasts[i], row, col) : 0;
        best = Math.min(best, start[i] + (Number.isFinite(ld) ? ld : 0));
        continue;
      }
      if (!blastHasFx(blasts[i])) continue;
      best = Math.min(best, start[i] + localDelay(blasts[i], row, col));
    }
    const d = best === Infinity ? 0 : best;
    delays.set(k, d);
    lastHit = Math.max(lastHit, d);
  });

  const result: ClearSchedule = {
    delays,
    blasts: blasts.map((blast, i) => ({ blast, start: start[i], payload: payloadOf.get(i), carried: carried.has(i) })),
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

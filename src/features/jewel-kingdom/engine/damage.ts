import type { Blocker, Board, Position, Spread } from './types';
import { allocGemId, at, cloneBoard, inBounds, key, parseKey } from './board';

/**
 * 매치와 폭발이 장애물·덮개에 주는 피해.
 *
 * 보석을 없애는 것과 장애물을 깎는 것은 다른 일이다. 장애물은 보통 터지는
 * 칸에 있지 않고 그 **옆**에 있으며, 덮개는 반대로 보석이 터지는 걸 **막는다**.
 * 이 둘을 삭제 로직에 섞으면 규칙이 뒤엉키므로 따로 둔다.
 */

/**
 * 무엇이 몇 번 맞았는지. 레벨 목표("상자 5개 제거")를 세려면 좌표만으로는
 * 부족하고 종류가 필요하다 - 맞은 순간 보드에서 그 정보가 사라지기 때문이다.
 */
export interface DamageEvent {
  key: string;
  /** 겉모습 이름(box, ice, ...) */
  kind: string;
  target: 'blocker' | 'cover' | 'ground' | 'spread';
  /** 이번 타격으로 완전히 없어졌는가 */
  destroyed: boolean;
}

export interface DamageResult {
  board: Board;
  /** 덮개가 대신 맞아서 보석이 살아남은 칸 - 삭제 대상에서 빼야 한다 */
  shielded: Set<string>;
  /** 이번에 겹이 깎인 것들 */
  events: DamageEvent[];
  /**
   * 장애물이 부서지면서 함께 터뜨린 칸(통·폭죽탑).
   * 다음 연쇄의 씨앗으로 넘긴다 - 여기서 직접 지우면 폭발이 또 폭발을
   * 부르는 경우를 이 함수 안에서 재귀로 풀어야 하고, 그러면 연쇄 단계가
   * 화면에 한 번에 뭉쳐 나온다.
   */
  chain: Set<string>;
}

/** 판에 살아 있는 장애물 종류. requires 판정에 쓴다. */
function liveKinds(board: Board): Set<string> {
  const kinds = new Set<string>();
  board.cells.forEach(c => {
    if (c.blocker) kinds.add(c.blocker.kind);
  });
  return kinds;
}

/**
 * 다른 칸 때문에 지금 무적인가.
 *
 * "앞을 치워야 뒤가 열린다"(묘비←유령)와 "누가 지켜주고 있다"(크리스탈이
 * 지키는 대상)를 한 축으로 본다. 둘 다 **다른 칸의 생사가 이 칸의 무적을
 * 결정한다**로 같고, 방향만 반대다.
 */
function isGated(blocker: Blocker, alive: Set<string>): boolean {
  return blocker.requires !== undefined && alive.has(blocker.requires);
}

/**
 * 무언가를 판에 번지게 한다(꿀단지→꿀, 화분→잎, 거북→제 열의 잎).
 *
 * 치우면 사라지는 게 아니라 **문제가 넓게 번지는** 축이다. 한 칸을 치우는
 * 대가로 아홉 칸이 생기므로, 언제 터뜨리느냐가 곧 난이도가 된다.
 */
export function applySpread(board: Board, origin: Position, spread: Spread): string[] {
  const touched: string[] = [];
  const layers = spread.layers ?? 1;
  const radius = spread.radius ?? 1;

  const spots: Position[] = [];
  if (spread.shape === 'column') {
    for (let r = 0; r < board.height; r++) spots.push({ row: r, col: origin.col });
  } else {
    for (let r = origin.row - radius; r <= origin.row + radius; r++) {
      for (let c = origin.col - radius; c <= origin.col + radius; c++) spots.push({ row: r, col: c });
    }
  }

  spots.forEach(({ row, col }) => {
    if (!inBounds(board, row, col)) return;
    const cell = at(board, row, col);
    if (!cell.exists || cell.blocker || cell.collector) return;

    if (spread.layer === 'cover') {
      // 보석이 없는 칸에는 덮개를 씌울 수 없다 - 덮개는 보석을 덮는 것이다.
      if (!cell.gem || cell.cover) return;
      cell.cover = { kind: spread.kind, layers, locks: true };
    } else if (spread.layer === 'ground') {
      if (cell.ground) return;
      // 젤리폭탄이 쏟은 젤리도 젤리다 - 거기서부터 다시 번져야 한다.
      cell.ground = { kind: spread.kind, layers, ...(spread.grows ? { spreads: true } : {}) };
    } else {
      cell.gem = null;
      cell.blocker = { kind: spread.kind, layers };
    }
    touched.push(key(row, col));
  });

  return touched;
}

/**
 * 지목한 칸의 장애물·덮개를 직접 한 겹 깎는다(망치 부스터).
 * 매치는 옆에서 때리지만 부스터는 정면으로 때린다.
 */
export function damageAt(board: Board, k: string): DamageResult {
  const next = cloneBoard(board);
  const { row, col } = parseKey(k);
  const cell = at(next, row, col);
  const events: DamageEvent[] = [];

  const chain = new Set<string>();

  if (cell.cover) {
    const gone = cell.cover.layers <= 1;
    events.push({ key: k, kind: cell.cover.kind, target: 'cover', destroyed: gone });
    cell.cover = gone ? null : { ...cell.cover, layers: cell.cover.layers - 1 };
    return { board: next, shielded: new Set([k]), events, chain };
  }
  if (cell.blocker) {
    // 지켜주는 것이 살아 있으면 망치도 안 통한다 - 부스터라고 예외를 두면
    // "앞을 먼저 치운다"는 규칙이 부스터 한 번으로 무너진다.
    if (isGated(cell.blocker, liveKinds(next))) {
      return { board, shielded: new Set([k]), events, chain };
    }
    if (cell.blocker.layers > 1) {
      events.push({ key: k, kind: cell.blocker.kind, target: 'blocker', destroyed: false });
      cell.blocker = { ...cell.blocker, layers: cell.blocker.layers - 1 };
    } else {
      destroyBlocker(next, k, events, chain);
    }
    return { board: next, shielded: new Set([k]), events, chain };
  }
  if (!cell.gem && cell.ground) {
    const gone = cell.ground.layers <= 1;
    events.push({ key: k, kind: cell.ground.kind, target: 'ground', destroyed: gone });
    cell.ground = gone ? null : { ...cell.ground, layers: cell.ground.layers - 1 };
    return { board: next, shielded: new Set([k]), events, chain };
  }
  return { board: next, shielded: new Set(), events, chain };
}

const NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/**
 * @param cleared    이번에 터지는 칸 전체
 * @param blastCells 그중 아이템 폭발로 딸려 들어온 칸 (일반 매치로 터진 칸과 구분)
 *
 * 폭발로 터진 칸을 따로 아는 이유: "아이템으로만 부서지는" 장애물이 있다.
 * 일반 매치가 옆에서 터져도 안 깨지고 폭발만 통한다(SPEC 6장 "아이템 전용" 축).
 */
export function applyDamage(
  board: Board,
  cleared: Set<string>,
  blastCells: Set<string> = new Set(),
): DamageResult {
  const next = cloneBoard(board);
  const shielded = new Set<string>();
  const events: DamageEvent[] = [];

  // 1. 덮개: 터지는 칸의 보석이 덮여 있으면 덮개가 대신 한 겹 벗겨지고
  //    보석은 살아남는다. 덮개를 다 벗겨야 그 보석을 없앨 수 있다.
  cleared.forEach(k => {
    const { row, col } = parseKey(k);
    const cell = at(next, row, col);
    if (!cell.cover) return;

    shielded.add(k);
    // 아이템으로만 벗겨지는 덮개(사슬)는 일반 매치를 그냥 막아낸다.
    // 보석은 여전히 살아남지만 덮개는 한 겹도 안 깎인다.
    if (cell.cover.powerUpOnly && !blastCells.has(k)) return;

    const kind = cell.cover.kind;
    const gone = cell.cover.layers <= 1;
    cell.cover = gone ? null : { ...cell.cover, layers: cell.cover.layers - 1 };
    events.push({ key: k, kind, target: 'cover', destroyed: gone });
  });

  // 2. 바닥: 그 칸에서 보석이 실제로 터져야 한 겹 벗겨진다.
  //    덮개가 막아준 칸은 보석이 안 터졌으므로 바닥도 그대로다.
  //    옆에서 터뜨리는 걸로 되는 장애물과 다른 점이다.
  cleared.forEach(k => {
    if (shielded.has(k)) return;
    const { row, col } = parseKey(k);
    const cell = at(next, row, col);
    if (!cell.ground || cell.ground.spreads) return;
    const gone = cell.ground.layers <= 1;
    events.push({ key: k, kind: cell.ground.kind, target: 'ground', destroyed: gone });
    cell.ground = gone ? null : { ...cell.ground, layers: cell.ground.layers - 1 };
  });

  // 2-1. 번지는 바닥(젤리): 벗겨지는 게 아니라 **옆 칸으로 넓어진다.**
  //
  //  판정을 원본(board)에서 읽는 이유: 이번에 새로 번진 칸을 다시 씨앗으로 삼으면
  //  한 수에 판을 가로질러 퍼진다. 한 번의 매치는 한 칸만 넓힌다.
  cleared.forEach(k => {
    if (shielded.has(k)) return;
    const { row, col } = parseKey(k);
    if (at(next, row, col).ground) return;

    for (const [dr, dc] of NEIGHBORS) {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(board, r, c)) continue;
      const source = at(board, r, c).ground;
      if (!source?.spreads) continue;

      at(next, row, col).ground = { ...source };
      events.push({ key: k, kind: source.kind, target: 'spread', destroyed: false });
      break;
    }
  });

  // 3. 장애물: 터지는 칸에 "인접한" 장애물이 한 겹 깎인다.
  //    한 장애물은 한 번의 clear에서 최대 한 겹만 깎인다.
  //    왜: 로켓이 벽을 따라 지나가면 인접 칸이 여러 개 터지는데, 칸마다 세면
  //    8겹짜리 장애물이 한 방에 사라진다.
  const alive = liveKinds(next);
  const groups = groupMap(next);
  const hitOnce = new Set<string>();
  const chain = new Set<string>();

  cleared.forEach(k => {
    const { row, col } = parseKey(k);
    const sourceColor = at(board, row, col).gem?.color ?? null;
    const fromBlast = blastCells.has(k);

    NEIGHBORS.forEach(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(next, r, c)) return;
      const nk = key(r, c);
      if (hitOnce.has(nk)) return;

      const cell = at(next, r, c);
      const blocker = cell.blocker;
      if (!blocker) return;
      if (blocker.powerUpOnly && !fromBlast) return;
      // 덩어리에 약점이 있으면 그 칸으로만 타격이 들어간다(돌뱀의 머리).
      if (blocker.group && !blocker.weak && groups.get(blocker.group)?.hasWeak) return;
      // 지켜주는 것이 아직 살아 있으면 아무것도 안 통한다.
      if (isGated(blocker, alive)) return;
      if (blocker.hidden) {
        // 숨어 있던 장애물은 첫 타격에 드러나기만 하고 겹은 안 깎인다.
        // 드러나는 것 자체가 한 번의 상호작용이라 hitOnce에도 넣는다.
        hitOnce.add(nk);
        cell.blocker = { ...blocker, hidden: false };
        events.push({ key: nk, kind: blocker.kind, target: 'blocker', destroyed: false });
        return;
      }
      if (blocker.color !== undefined && blocker.color !== sourceColor) return;

      hitOnce.add(nk);

      // 방패가 남아 있으면 겹은 건드리지 못한다. 방패는 폭발로만 벗겨진다.
      if (blocker.shield && blocker.shield > 0) {
        if (!fromBlast) return;
        cell.blocker = { ...blocker, shield: blocker.shield - 1 };
        events.push({ key: nk, kind: blocker.kind, target: 'blocker', destroyed: false });
        return;
      }

      if (blocker.layers > 1) {
        cell.blocker = { ...blocker, layers: blocker.layers - 1 };
        events.push({ key: nk, kind: blocker.kind, target: 'blocker', destroyed: false });
        return;
      }

      destroyBlocker(next, nk, events, chain, groups);
    });
  });

  events.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
  return { board: next, shielded, events, chain };
}

interface GroupInfo {
  keys: string[];
  hasWeak: boolean;
}

/** 여러 칸에 걸친 장애물을 이름별로 묶는다(마법의 벽·돌뱀·성) */
function groupMap(board: Board): Map<string, GroupInfo> {
  const map = new Map<string, GroupInfo>();
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const b = at(board, r, c).blocker;
      if (!b?.group) continue;
      const info = map.get(b.group) ?? { keys: [], hasWeak: false };
      info.keys.push(key(r, c));
      if (b.weak) info.hasWeak = true;
      map.set(b.group, info);
    }
  }
  return map;
}

/**
 * 장애물 하나를 없애고 뒷일을 처리한다.
 *
 * 쪼개짐·번짐·아이템 낙하·폭발·덩어리 붕괴가 전부 여기 모인다. 타격 판정과
 * 섞어두면 "부서지는 경로"가 매치·폭발·부스터마다 따로 생겨서 곧 어긋난다.
 */
export function destroyBlocker(
  board: Board,
  k: string,
  events: DamageEvent[],
  chain: Set<string>,
  groups: Map<string, GroupInfo> = groupMap(board),
  cascade = true,
): void {
  const { row, col } = parseKey(k);
  const cell = at(board, row, col);
  const blocker = cell.blocker;
  if (!blocker) return;

  cell.blocker = null;
  events.push({ key: k, kind: blocker.kind, target: 'blocker', destroyed: true });

  // 약점이 부서지면 덩어리 전체가 무너진다(돌뱀).
  if (cascade && blocker.group && blocker.weak) {
    groups.get(blocker.group)?.keys.forEach(gk => {
      if (gk !== k) destroyBlocker(board, gk, events, chain, groups, false);
    });
  }

  if (blocker.spreads) applySpread(board, { row, col }, blocker.spreads);

  if (blocker.drops) {
    cell.gem = {
      id: allocGemId(board),
      color: blocker.drops === 'lightball' ? null : 0,
      special: blocker.drops,
    };
  }

  if (blocker.explodes) {
    const r0 = blocker.explodes;
    for (let r = row - r0; r <= row + r0; r++) {
      for (let c = col - r0; c <= col + r0; c++) {
        if (!inBounds(board, r, c)) continue;
        if (at(board, r, c).exists) chain.add(key(r, c));
      }
    }
  }

  if (blocker.splitsInto) {
    const spec = blocker.splitsInto;
    const spots: Position[] = [
      { row, col },
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];
    let placed = 0;
    for (const p of spots) {
      if (placed >= spec.count) break;
      if (!inBounds(board, p.row, p.col)) continue;
      const target = at(board, p.row, p.col);
      if (!target.exists || target.blocker) continue;
      target.gem = null;
      target.blocker = { kind: spec.kind, layers: spec.layers, moving: spec.moving };
      events.push({ key: key(p.row, p.col), kind: spec.kind, target: 'blocker', destroyed: false });
      placed++;
    }
  }
}

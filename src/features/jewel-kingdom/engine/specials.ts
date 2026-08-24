import type { Board, Position, SpecialKind } from './types';
import { at, isPlayable, key, parseKey } from './board';
import type { MatchGroup } from './match';

// ─────────────────────────────────────────────────────────────
// ※ SPEC 대상 구역 ※
// 아래 두 표가 "레퍼런스와 같은가"를 결정하는 전부다.
// 규칙을 바꾸려면 표만 고친다. 로직은 표를 읽을 뿐이다.
// docs/SPEC.md 의 항목 번호와 1:1로 대응시킬 것.
// ─────────────────────────────────────────────────────────────

export interface SpawnRule {
  /** 이 길이 이상이면 */
  minLength: number;
  /** 이 방향의 줄에서 */
  shape: 'row' | 'col' | 'any';
  /** 이 아이템이 생긴다 */
  kind: SpecialKind;
}

/**
 * 위에서부터 먼저 맞는 규칙이 이긴다(긴 매치 우선).
 *
 * 로켓 방향은 매치 방향과 **수직**이다 - 가로로 4개를 맞추면 세로 로켓이 나온다.
 * 직관과 반대라서 확인 없이 구현하면 반드시 틀린다(실제로 처음엔 반대로 짰다).
 * 출처: Royal Match Wiki - Rocket / SPEC.md 3.1~3.2
 */
export const SPAWN_RULES: SpawnRule[] = [
  { minLength: 5, shape: 'any', kind: 'lightball' },
  { minLength: 4, shape: 'row', kind: 'rocket-v' },
  { minLength: 4, shape: 'col', kind: 'rocket-h' },
];

/** 두 줄이 교차(L/T자)하면 생기는 아이템. null이면 교차 규칙 없음. */
export const INTERSECTION_KIND: SpecialKind | null = 'tnt';

/**
 * TNT 반경. 1이면 3x3, 2면 5x5.
 * 레퍼런스는 "two-tile radius"(5x5 = 25칸)다. TNT+TNT 합체가 반경 4(9x9 = 81칸,
 * 문서상 "약 80칸")인 것과도 앞뒤가 맞는다. SPEC.md 4.2 / 5장
 */
export const TNT_RADIUS = 2;

// ─────────────────────────────────────────────────────────────

export interface SpecialSpawn {
  key: string;
  kind: SpecialKind;
}

export interface Blast {
  row: number;
  col: number;
  kind: SpecialKind;
  /** 라이트볼가 지목한 색(라이트볼일 때만) */
  targetColor?: number | null;
}

/**
 * 이번 매치들로 어떤 아이템이 어디에 생기는지 결정한다.
 * preferred(플레이어가 직접 움직인 칸)가 그 매치에 포함되면 거기에 생긴다.
 * 왜: 손가락이 있던 자리에 생겨야 "내가 만들었다"가 읽힌다. 연쇄로 생긴
 * 경우엔 그런 기준점이 없으므로 줄의 중앙에 둔다.
 */
export function planSpecials(groups: MatchGroup[], preferred: Position[] = []): SpecialSpawn[] {
  const preferredKeys = new Set(preferred.map(p => key(p.row, p.col)));
  const spawns: SpecialSpawn[] = [];
  const used = new Set<string>();

  // 교차점 먼저 - 같은 칸을 두 줄이 공유하면 그게 L/T자다.
  if (INTERSECTION_KIND) {
    const seen = new Map<string, MatchGroup>();
    groups.forEach(g => {
      g.cells.forEach(c => {
        const other = seen.get(c);
        if (other && other.shape !== g.shape && !used.has(c)) {
          used.add(c);
          spawns.push({ key: c, kind: INTERSECTION_KIND });
        } else if (!other) {
          seen.set(c, g);
        }
      });
    });
  }

  groups.forEach(group => {
    // 이미 교차점 아이템이 나온 줄은 건너뛴다(한 매치에 아이템 하나).
    if (group.cells.some(c => used.has(c))) return;
    const rule = SPAWN_RULES.find(
      r => group.cells.length >= r.minLength && (r.shape === 'any' || r.shape === group.shape),
    );
    if (!rule) return;
    const spot =
      group.cells.find(c => preferredKeys.has(c)) ??
      group.cells[Math.floor(group.cells.length / 2)];
    if (used.has(spot)) return;
    used.add(spot);
    spawns.push({ key: spot, kind: rule.kind });
  });

  return spawns;
}

/** 아이템 하나가 터뜨리는 범위. 표를 읽어 좌표만 계산한다. */
export function blastArea(
  board: Board,
  row: number,
  col: number,
  kind: SpecialKind,
  targetColor: number | null,
): string[] {
  const out: string[] = [];
  const push = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= board.height || c >= board.width) return;
    out.push(key(r, c));
  };

  switch (kind) {
    case 'rocket-h':
      for (let c = 0; c < board.width; c++) push(row, c);
      break;
    case 'rocket-v':
      for (let r = 0; r < board.height; r++) push(r, col);
      break;
    case 'tnt':
      for (let r = row - TNT_RADIUS; r <= row + TNT_RADIUS; r++) {
        for (let c = col - TNT_RADIUS; c <= col + TNT_RADIUS; c++) push(r, c);
      }
      break;
    case 'lightball':
      // 지목된 색 전부. 지목이 없으면(연쇄로 휘말린 경우) 아무 것도 안 터진다.
      if (targetColor === null) break;
      for (let r = 0; r < board.height; r++) {
        for (let c = 0; c < board.width; c++) {
          const cell = at(board, r, c);
          if (cell.gem && cell.gem.color === targetColor) push(r, c);
        }
      }
      break;
  }
  return out;
}

/**
 * 삭제 대상에 아이템이 포함돼 있으면 그 발동 범위를 삭제 대상에 더한다.
 * 새로 딸려 들어온 칸에 또 아이템이 있으면 그것도 터진다(연쇄 발동).
 * 발동된 아이템 목록도 같이 돌려준다 - 연출은 이걸 보고 그린다.
 */
export function expandSpecials(
  board: Board,
  seed: Set<string>,
  lightballTarget: number | null = null,
): { cells: Set<string>; blasts: Blast[]; blastCells: Set<string> } {
  const cells = new Set(seed);
  // 폭발로 딸려 들어온 칸만 따로 센다 - "아이템으로만 부서지는" 장애물 판정에 쓴다.
  const blastCells = new Set<string>();
  const blasts: Blast[] = [];
  const queue = [...seed];

  while (queue.length > 0) {
    const k = queue.pop() as string;
    const { row, col } = parseKey(k);
    const cell = at(board, row, col);
    const kind = cell.gem?.special;
    if (!kind) continue;
    if (blasts.some(b => b.row === row && b.col === col)) continue;

    const targetColor = kind === 'lightball' ? lightballTarget : null;
    blasts.push({ row, col, kind, targetColor });

    blastArea(board, row, col, kind, targetColor).forEach(nk => {
      const p = parseKey(nk);
      if (!isPlayable(at(board, p.row, p.col))) return;
      blastCells.add(nk);
      if (cells.has(nk)) return;
      cells.add(nk);
      queue.push(nk);
    });
  }

  return { cells, blasts, blastCells };
}

/** 아이템이 생길 칸의 보석을 그 자리에서 변신시킨다. id는 유지한다. */
export function markSpecials(board: Board, spawns: SpecialSpawn[]): Board {
  if (spawns.length === 0) return board;
  const next: Board = { ...board, cells: board.cells.map(c => ({ ...c })) };
  spawns.forEach(({ key: k, kind }) => {
    const { row, col } = parseKey(k);
    const cell = next.cells[row * next.width + col];
    if (!cell.gem) return;
    cell.gem = { ...cell.gem, special: kind, color: kind === 'lightball' ? null : cell.gem.color };
  });
  return next;
}

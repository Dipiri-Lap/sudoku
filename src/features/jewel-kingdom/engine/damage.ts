import type { Board } from './types';
import { at, cloneBoard, inBounds, key, parseKey } from './board';

/**
 * 매치와 폭발이 장애물·덮개에 주는 피해.
 *
 * 보석을 없애는 것과 장애물을 깎는 것은 다른 일이다. 장애물은 보통 터지는
 * 칸에 있지 않고 그 **옆**에 있으며, 덮개는 반대로 보석이 터지는 걸 **막는다**.
 * 이 둘을 삭제 로직에 섞으면 규칙이 뒤엉키므로 따로 둔다.
 */

export interface DamageResult {
  board: Board;
  /** 덮개가 대신 맞아서 보석이 살아남은 칸 - 삭제 대상에서 빼야 한다 */
  shielded: Set<string>;
  /** 이번에 겹이 하나 깎인 칸(장애물·덮개) */
  damaged: string[];
  /** 이번에 완전히 없어진 장애물 칸 */
  destroyed: string[];
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
  const damaged: string[] = [];
  const destroyed: string[] = [];

  // 1. 덮개: 터지는 칸의 보석이 덮여 있으면 덮개가 대신 한 겹 벗겨지고
  //    보석은 살아남는다. 덮개를 다 벗겨야 그 보석을 없앨 수 있다.
  cleared.forEach(k => {
    const { row, col } = parseKey(k);
    const cell = at(next, row, col);
    if (!cell.cover) return;
    cell.cover = cell.cover.layers > 1 ? { ...cell.cover, layers: cell.cover.layers - 1 } : null;
    shielded.add(k);
    damaged.push(k);
  });

  // 2. 장애물: 터지는 칸에 "인접한" 장애물이 한 겹 깎인다.
  //    한 장애물은 한 번의 clear에서 최대 한 겹만 깎인다.
  //    왜: 로켓이 벽을 따라 지나가면 인접 칸이 여러 개 터지는데, 칸마다 세면
  //    8겹짜리 장애물이 한 방에 사라진다.
  const hitOnce = new Set<string>();
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
      if (blocker.hidden) return; // 아직 드러나지 않았다
      if (blocker.powerUpOnly && !fromBlast) return;
      if (blocker.color !== undefined && blocker.color !== sourceColor) return;

      hitOnce.add(nk);
      if (blocker.layers > 1) {
        cell.blocker = { ...blocker, layers: blocker.layers - 1 };
        damaged.push(nk);
      } else {
        cell.blocker = null;
        damaged.push(nk);
        destroyed.push(nk);
      }
    });
  });

  return { board: next, shielded, damaged: damaged.sort(), destroyed: destroyed.sort() };
}

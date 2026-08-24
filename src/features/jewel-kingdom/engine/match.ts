import type { Board, Position } from './types';
import { at, isPlayable, key } from './board';

export type MatchShape = 'row' | 'col';

export interface MatchGroup {
  cells: string[];
  shape: MatchShape;
  /** 이 줄의 색 */
  color: number;
}

/**
 * 3개 이상 이어진 줄을 "덩어리" 단위로 돌려준다.
 * 몇 칸짜리 어떤 방향인지를 알아야 어떤 아이템이 생기는지 결정할 수 있으므로,
 * 평평한 Set이 아니라 그룹 목록이 1차 결과다.
 *
 * 색이 없는 보석(라이트볼)은 어떤 줄에도 참여하지 않는다.
 */
export function findMatchGroups(board: Board): MatchGroup[] {
  const groups: MatchGroup[] = [];

  const colorAt = (r: number, c: number): number | null => {
    const cell = at(board, r, c);
    if (!isPlayable(cell) || !cell.gem) return null;
    return cell.gem.color;
  };

  const scan = (
    outer: number,
    innerLen: number,
    pos: (outer: number, inner: number) => Position,
    shape: MatchShape,
  ) => {
    let runStart = 0;
    for (let i = 1; i <= innerLen; i++) {
      const p = pos(outer, i - 1);
      const prev = colorAt(p.row, p.col);
      const cur = i < innerLen ? (() => { const q = pos(outer, i); return colorAt(q.row, q.col); })() : null;
      const broken = cur === null || prev === null || cur !== prev;
      if (!broken) continue;
      if (prev !== null && i - runStart >= 3) {
        const cells: string[] = [];
        for (let k = runStart; k < i; k++) {
          const q = pos(outer, k);
          cells.push(key(q.row, q.col));
        }
        groups.push({ cells, shape, color: prev });
      }
      runStart = i;
    }
  };

  for (let r = 0; r < board.height; r++) {
    scan(r, board.width, (o, i) => ({ row: o, col: i }), 'row');
  }
  for (let c = 0; c < board.width; c++) {
    scan(c, board.height, (o, i) => ({ row: i, col: o }), 'col');
  }

  return groups;
}

export function findMatches(board: Board): Set<string> {
  const out = new Set<string>();
  findMatchGroups(board).forEach(g => g.cells.forEach(k => out.add(k)));
  return out;
}

export function hasMatch(board: Board): boolean {
  return findMatchGroups(board).length > 0;
}

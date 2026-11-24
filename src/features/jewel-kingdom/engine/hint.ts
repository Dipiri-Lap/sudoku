import { at, key, swap } from './board';
import { findMatchGroups } from './match';
import { listMoves } from './resolve';
import type { Board, Position } from './types';

/** 힌트: 어떤 두 칸을 바꾸면 되는지, 그때 함께 터질 칸들(지금 자리 기준) */
export interface Hint {
  a: Position;
  b: Position;
  /** 자리를 옮기는 칸과 그 방향(칸 단위) */
  movers: { pos: Position; dr: number; dc: number }[];
  /** 함께 맞춰질 칸들(옮기는 칸 포함) */
  cells: string[];
}

/**
 * 가만히 있으면 보여줄 한 수.
 * 아이템끼리 합체 > 아이템이 생기는 큰 매치 > 그냥 3매치 순으로 고른다.
 * 아이템 하나만 옆 보석과 바꾸는 수는 매치가 없을 때만 고른다(탭만 해도 되는 거라 힌트로는 약하다).
 */
export function findHint(board: Board): Hint | null {
  let best: { hint: Hint; score: number } | null = null;
  for (const { a, b } of listMoves(board)) {
    const ga = at(board, a.row, a.col).gem;
    const gb = at(board, b.row, b.col).gem;
    const ka = key(a.row, a.col), kb = key(b.row, b.col);
    const dr = b.row - a.row, dc = b.col - a.col;
    let score: number;
    let cells: string[];
    let movers: Hint['movers'];
    if (ga?.special && gb?.special) {
      score = 100;
      cells = [ka, kb];
      movers = [{ pos: a, dr, dc }];
    } else {
      const trial = swap(board, a, b);
      const groups = findMatchGroups(trial).filter(g => g.cells.includes(ka) || g.cells.includes(kb));
      // 바꾼 뒤 자리 → 지금 자리
      const back = (k: string) => (k === ka ? kb : k === kb ? ka : k);
      const set = new Set<string>();
      groups.forEach(g => g.cells.forEach(k => set.add(back(k))));
      if (set.size === 0) {
        // 아이템 하나 + 보석: 매치는 없지만 둘 수는 있는 수
        score = 1;
        cells = [ka, kb];
        movers = [{ pos: ga?.special ? a : b, dr: ga?.special ? dr : -dr, dc: ga?.special ? dc : -dc }];
      } else {
        cells = [...set];
        // a의 보석이 b로 가서 맞춰지면 a가 움직이는 칸, 반대도 마찬가지
        const inTrial = new Set(groups.flatMap(g => g.cells));
        movers = [];
        if (inTrial.has(kb)) movers.push({ pos: a, dr, dc });
        if (inTrial.has(ka)) movers.push({ pos: b, dr: -dr, dc: -dc });
        const big = Math.max(...groups.map(g => g.cells.length));
        score = 10 + set.size + (big >= 4 || groups.some(g => g.shape === 'square') ? 20 : 0);
      }
    }
    if (!best || score > best.score) best = { hint: { a, b, movers, cells }, score };
  }
  return best?.hint ?? null;
}

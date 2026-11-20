import { describe, it, expect } from 'vitest';
import { parseBoard, renderBoard } from '../engine/notation';
import { at, key } from '../engine/board';
import {
  blastArea,
  destinationsFor,
  expandSpecials,
  findCombo,
} from '../engine/specials';
import { resolveTurn } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import { SKILLS, plantSkill } from '../engine/skills';
import type { SpecialKind } from '../engine/types';

const FILLER = `
  R G B Y P O R
  G B Y P O R G
  B Y P O R G B
  Y P O R G B Y
  P O R G B Y P
  O R G B Y P O
  R G B Y P O R`;

describe('스킬 아이템 심기', () => {
  it('색 없는 아이템(물뿌리개·민들레)은 심으면 색이 지워진다', () => {
    const planted = plantSkill(parseBoard(FILLER), { row: 0, col: 0 }, 'watering-can');
    expect(at(planted, 0, 0).gem?.special).toBe('watering-can');
    expect(at(planted, 0, 0).gem?.color).toBeNull();
    expect(at(plantSkill(parseBoard(FILLER), { row: 0, col: 0 }, 'sickle'), 0, 0).gem?.color).toBe(0);
  });
});

describe('새 아이템 범위', () => {
  const board = parseBoard(FILLER);
  const mid = 3;

  it('낫: 대각선 두 줄', () => {
    const cells = new Set(blastArea(board, mid, mid, 'sickle', null));
    expect(cells.size).toBe(13); // 7 + 7 - 가운데 겹침
    expect(cells.has(key(0, 0))).toBe(true);
    expect(cells.has(key(0, 6))).toBe(true);
    expect(cells.has(key(mid, 0))).toBe(false);
  });

  it('쟁기: 3줄 두께, 좌우 3칸', () => {
    expect(new Set(blastArea(board, mid, mid, 'plow', null)).size).toBe(21);
  });

  it('스프링클러: 마름모 반경 3', () => {
    const cells = new Set(blastArea(board, mid, mid, 'sprinkler', null));
    expect(cells.size).toBe(25);
    expect(cells.has(key(0, mid))).toBe(true);
    expect(cells.has(key(0, 0))).toBe(false);
  });

  it('허수아비: 가로세로 십자 + 판의 까마귀 전부', () => {
    expect(new Set(blastArea(board, mid, mid, 'scarecrow', null)).size).toBe(13);
    const withCrow = parseBoard(renderBoard(board));
    at(withCrow, 0, 0).blocker = { kind: 'ghost', layers: 1 };
    at(withCrow, 1, 5).blocker = { kind: 'box', layers: 1 };
    const cells = new Set(blastArea(withCrow, mid, mid, 'scarecrow', null));
    expect(cells.has(key(0, 0))).toBe(true);
    expect(cells.has(key(1, 5))).toBe(false);
    expect(cells.size).toBe(14);
  });

  it('제비는 서로 다른 두 곳, 민들레는 열 곳을 노린다', () => {
    const b2 = destinationsFor(board, { row: mid, col: mid }, 'butterfly');
    expect(b2.length).toBe(2);
    expect(key(b2[0].row, b2[0].col)).not.toBe(key(b2[1].row, b2[1].col));
    const d10 = destinationsFor(board, { row: mid, col: mid }, 'dandelion');
    expect(new Set(d10.map(d => key(d.row, d.col))).size).toBe(10);
  });

  it('수박폭탄: 제자리 3x3 + 목표 지점 3x3', () => {
    const withBomb = parseBoard(FILLER.replace(/^(\s*R G B) Y/m, '$1 Ym'));
    const { blasts, cells } = expandSpecials(withBomb, new Set([key(0, 3)]));
    expect(blasts[0].kind).toBe('watermelon');
    expect(blasts[0].destinations?.length).toBe(1);
    expect(cells.size).toBeGreaterThan(9);
  });

  it('물뿌리개: 바닥이 있는 칸을 전부 친다', () => {
    const grassy = parseBoard(`
      R^ G  B^
      G  Wc Y
      B^ Y  R^`);
    const cells = new Set(blastArea(grassy, 1, 1, 'watering-can', null));
    ['0,0', '0,2', '2,0', '2,2', '1,1'].forEach(k => expect(cells.has(k)).toBe(true));
    expect(cells.has('0,1')).toBe(false);
  });

  it('바닥이 하나도 없으면 물뿌리개는 가장 많은 색을 대신 친다', () => {
    const plain = parseBoard('R R G\nWc R B');
    const cells = new Set(blastArea(plain, 1, 0, 'watering-can', null));
    expect(cells.has('0,0') && cells.has('0,1') && cells.has('1,1')).toBe(true);
  });
});

describe('계열 합체', () => {
  it('새 아이템도 계열로 합체한다', () => {
    expect(findCombo('sickle', 'plow')).toEqual(findCombo('rocket-h', 'rocket-h'));
    expect(findCombo('watermelon', 'sprinkler')).toEqual(findCombo('tnt', 'tnt'));
    expect(findCombo('dandelion', 'lightball')).toEqual({ effect: 'clear-board' });
  });

  it('변신·운반은 실제로 합쳐진 아이템을 쓴다', () => {
    expect(findCombo('lightball', 'sickle')).toEqual({ effect: 'transform', into: 'sickle' });
    expect(findCombo('watering-can', 'watermelon')).toEqual({ effect: 'transform', into: 'watermelon' });
    expect(findCombo('butterfly', 'plow')).toEqual({ effect: 'carry', payload: 'plow' });
    expect(findCombo('ladybug', 'rocket-v')).toEqual({ effect: 'carry', payload: 'rocket-h' });
  });

  it('모든 아이템 짝이 합체 규칙을 가진다', () => {
    const all: SpecialKind[] = ['rocket-h', 'rocket-v', 'tnt', 'propeller', 'lightball', ...SKILLS.map(s => s.kind)];
    all.forEach(a => all.forEach(b => expect(findCombo(a, b)).not.toBeNull()));
  });

  it('새 아이템끼리 스왑하면 판이 온전하게 끝난다', () => {
    const kinds: SpecialKind[] = ['sickle', 'plow', 'butterfly', 'ladybug', 'watermelon', 'sprinkler', 'scarecrow'];
    kinds.forEach(a =>
      kinds.forEach(b => {
        const text = FILLER.replace(/^(\s*)R G/m, `$1R${suffix(a)} G${suffix(b)}`);
        const result = resolveTurn(parseBoard(text), { row: 0, col: 0 }, { row: 0, col: 1 }, makeRng(3));
        expect(result.valid).toBe(true);
        result.board.cells.forEach(c => {
          if (c.exists && !c.blocker) expect(c.gem).not.toBeNull();
        });
      }),
    );
  });
});

describe('표기', () => {
  it('새 아이템이 표기로 오간다', () => {
    const text = 'Rx Gp Bb\nYl Pm Os\nWd Wc W\nGk R G';
    const board = parseBoard(text);
    expect(at(board, 0, 0).gem?.special).toBe('sickle');
    expect(at(board, 3, 0).gem?.special).toBe('scarecrow');
    expect(at(board, 2, 1).gem?.special).toBe('watering-can');
    expect(renderBoard(parseBoard(renderBoard(board)))).toBe(renderBoard(board));
  });
});

function suffix(kind: SpecialKind): string {
  return { sickle: 'x', plow: 'p', butterfly: 'b', ladybug: 'l', watermelon: 'm', sprinkler: 's', scarecrow: 'k' }[
    kind as 'sickle'
  ];
}

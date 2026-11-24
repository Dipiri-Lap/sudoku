import { describe, it, expect } from 'vitest';
import { parseBoard, renderBoard } from '../engine/notation';
import { at, key } from '../engine/board';
import {
  blastArea,
  destinationsFor,
  expandSpecials,
  findCombo,
} from '../engine/specials';
import { activateAt, resolveTurn } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import { SKILLS, plantSkill } from '../engine/skills';
import { goalTargetScorer } from '../engine/goals';
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

describe('참새류 목표 고르기', () => {
  // 장애물(상자)은 보석이 없는 칸이다. 예전에는 보석 칸만 후보라 상자 "옆" 보석을 쪼았다.
  const withBoxes = () => {
    const board = parseBoard(FILLER);
    at(board, 0, 6).blocker = { kind: 'box', layers: 1 };
    at(board, 0, 6).gem = null;
    at(board, 6, 0).blocker = { kind: 'box', layers: 1 };
    at(board, 6, 0).gem = null;
    return board;
  };
  const boxGoal = goalTargetScorer([{ kind: 'blocker', blockerKind: 'box', count: 2 }]);
  const isBox = (p: { row: number; col: number }) =>
    (p.row === 0 && p.col === 6) || (p.row === 6 && p.col === 0);

  it('참새는 목표 장애물 칸을 직접 노린다', () => {
    const board = withBoxes();
    const gem = at(board, 0, 3).gem!;
    at(board, 0, 3).gem = { ...gem, special: 'propeller' };
    const { blasts, blastBlockers } = expandSpecials(board, new Set([key(0, 3)]), {
      targetScorer: boxGoal,
      rng: makeRng(3),
    });
    expect(blasts[0].kind).toBe('propeller');
    const d = blasts[0].destination!;
    expect(isBox(d)).toBe(true);
    expect(blastBlockers.has(key(d.row, d.col))).toBe(true);
  });

  it('참새가 쪼면 옆에 터지는 칸이 없어도 그 장애물이 깨진다', () => {
    // 상자 하나만 판 구석에 두면 참새가 거기로 간다. 구석 상자 옆 칸은 참새 범위 밖이다.
    const board = parseBoard(FILLER);
    at(board, 6, 6).blocker = { kind: 'box', layers: 1 };
    at(board, 6, 6).gem = null;
    const gem = at(board, 0, 0).gem!;
    at(board, 0, 0).gem = { ...gem, special: 'propeller' };
    const result = activateAt(board, { row: 0, col: 0 }, makeRng(4), {
      targetScorer: goalTargetScorer([{ kind: 'blocker', blockerKind: 'box', count: 1 }]),
    });
    const clear = result.steps.find(s => s.kind === 'clear');
    expect(clear && clear.kind === 'clear' && clear.damage.some(e => e.key === '6,6' && e.destroyed)).toBe(true);
  });

  it('제비 두 마리는 목표 장애물 둘을 하나씩 노린다', () => {
    const dests = destinationsFor(withBoxes(), { row: 3, col: 3 }, 'butterfly', { targetScorer: boxGoal, rng: makeRng(1) });
    expect(dests.length).toBe(2);
    expect(dests.every(isBox)).toBe(true);
  });

  it('색 목표 판에서 민들레는 목표 색 블록만 콕콕 친다', () => {
    const board = parseBoard(FILLER);
    const colorGoal = goalTargetScorer([{ kind: 'color', color: 0, count: 10 }]);
    const dests = destinationsFor(board, { row: 3, col: 3 }, 'dandelion', { targetScorer: colorGoal, rng: makeRng(2) });
    // 출발 칸(3,3)도 빨강이라 후보에서 빠진다
    const reds = board.cells.filter(c => c.gem?.color === 0).length - (at(board, 3, 3).gem?.color === 0 ? 1 : 0);
    dests.slice(0, reds).forEach(d => expect(at(board, d.row, d.col).gem?.color).toBe(0));
  });
});

describe('도토리는 다른 아이템을 목표로 삼지 않는다', () => {
  it('토마토 목표일 때 빨간 도토리(같은 색 아이템)로 날아가지 않고 토마토로 간다', () => {
    // 도토리 (0,0)을 터뜨린다. 빨간 아이템들만 멀리 있고 토마토(R)는 (6,6) 하나뿐
    const board = parseBoard(`
      G@ B G B G B G
      B G B G B G B
      G B G B R@ B G
      B G B G B G B
      G B R- B G B G
      B G B G B G B
      G B G B G B R
    `);
    const scorer = goalTargetScorer([{ kind: 'color', color: 0, count: 2 }]);
    for (let seed = 1; seed <= 20; seed++) {
      const res = activateAt(board, { row: 0, col: 0 }, makeRng(seed), { targetScorer: scorer });
      const clear = res.steps.find(s => s.kind === 'clear');
      const fly = clear && clear.kind === 'clear' ? clear.blasts.find(b => b.kind === 'propeller') : undefined;
      expect(fly?.destination, `seed ${seed}`).toEqual({ row: 6, col: 6 });
    }
  });
});

describe('계란 판의 도토리', () => {
  it('계란 바로 아래 채소를 노려 계란이 떨어질 길을 터 준다', () => {
    const board = parseBoard(`
      R@ G B Y R G B
      G B Y R G B Y
      B Y R G B Y R
      Y R G B Y R G
      R G B Y R G B
      G B Y R G B Y
      B Y R G B Y R
    `);
    // (2,5)에 계란(수집물)을 놓는다
    const egg = at(board, 2, 5).gem!;
    at(board, 2, 5).gem = { ...egg, inert: true };
    const scorer = goalTargetScorer([{ kind: 'collect', collectKind: 'shelf', count: 2 }]);
    for (let seed = 1; seed <= 10; seed++) {
      const res = activateAt(board, { row: 0, col: 0 }, makeRng(seed), { targetScorer: scorer });
      const clear = res.steps.find(s => s.kind === 'clear');
      const fly = clear && clear.kind === 'clear' ? clear.blasts.find(b => b.kind === 'propeller') : undefined;
      expect(fly?.destination, `seed ${seed}`).toEqual({ row: 3, col: 5 });
    }
  });
});

describe('아이템이 지나간 줄 옆 장애물', () => {
  // 1열에 세로 삽, 2열에 버섯 기둥
  const setup = () => {
    const board = parseBoard(FILLER);
    for (const r of [1, 2, 3, 4]) {
      at(board, r, 2).blocker = { kind: 'mushroom', layers: 1 };
      at(board, r, 2).gem = null;
    }
    const gem = at(board, 3, 1).gem!;
    at(board, 3, 1).gem = { ...gem, special: 'rocket-v' };
    return board;
  };

  it('옆 줄을 쓸고 지나가도 장애물은 안 깎인다(범위 안만 친다)', () => {
    const result = activateAt(setup(), { row: 3, col: 1 }, makeRng(1));
    const clear = result.steps.find(s => s.kind === 'clear');
    expect(clear && clear.kind === 'clear' && clear.damage.filter(e => e.target === 'blocker')).toEqual([]);
  });

  it('범위 안에 든 장애물은 맞는다', () => {
    const board = setup();
    const gem = at(board, 2, 0).gem!;
    at(board, 3, 1).gem = { ...gem, special: 'rocket-h' };
    const result = activateAt(board, { row: 3, col: 1 }, makeRng(1));
    const clear = result.steps.find(s => s.kind === 'clear');
    expect(clear && clear.kind === 'clear' && clear.damage.some(e => e.key === '3,2' && e.destroyed)).toBe(true);
  });
});

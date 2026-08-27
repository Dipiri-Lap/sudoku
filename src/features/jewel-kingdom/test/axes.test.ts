import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at, key } from '../engine/board';
import { applyDamage } from '../engine/damage';
import { applyGravity } from '../engine/gravity';
import { countOnBoard } from '../engine/goals';
import { activateBooster, resolveTurn } from '../engine/resolve';
import { resolveOptionsFor, startLevel } from '../engine/level';
import { TEST_LEVELS } from '../data/testLevels';
import { golemHook, producerHook, regrowHook } from '../engine/hooks';
import { makeRng } from '../engine/rng';
import type { Blocker, Board } from '../engine/types';

/**
 * 레퍼런스를 조사해 새로 추가한 장애물 축들.
 *
 * 축마다 한 판씩 따로 세운다. 실제 레벨로 검사하면 어느 축이 깨졌는지 알 수 없고,
 * 축이 서로 간섭하는 경우(번지는 장애물이 지켜주는 대상 위에 번진다든지)를
 * 나중에 따로 추가하기도 어렵다.
 */

const rng = () => makeRng(2024);

function put(board: Board, row: number, col: number, blocker: Blocker): Board {
  at(board, row, col).blocker = blocker;
  at(board, row, col).gem = null;
  return board;
}

/** 그 칸 옆에서 3매치를 터뜨린다 */
function clearNextTo(board: Board, row: number, col: number) {
  return applyDamage(board, new Set([key(row, col)]));
}

describe('번지는 장애물', () => {
  it('부서지면 주변 3x3에 덮개가 번진다', () => {
    const board = put(
      parseBoard(`
        R G B Y R
        G B Y R G
        B Y R G B
        Y R G B Y
        R G B Y R
      `),
      2,
      2,
      { kind: 'honey-pot', layers: 1, spreads: { kind: 'honey', layer: 'cover', radius: 1 } },
    );

    const { board: after } = clearNextTo(board, 2, 1);

    expect(at(after, 2, 2).blocker).toBeNull();
    // 자기 자리는 보석이 없어서 못 덮이고, 둘러싼 여덟 칸이 덮인다.
    const honeyed = after.cells.filter(c => c.cover?.kind === 'honey').length;
    expect(honeyed).toBe(8);
    // 번진 꿀은 보석을 붙잡는다 - 그래서 한 칸을 치운 대가가 크다.
    expect(at(after, 1, 1).cover?.locks).toBe(true);
  });

  it('보석이 없는 칸에는 덮개가 안 번진다', () => {
    const board = parseBoard(`
      R G B
      G _ Y
      B Y R
    `);
    put(board, 0, 0, {
      kind: 'honey-pot',
      layers: 1,
      spreads: { kind: 'honey', layer: 'cover', radius: 1 },
    });

    const { board: after } = clearNextTo(board, 0, 1);
    expect(at(after, 1, 1).cover).toBeNull();
  });

  it('바닥까지 내려온 거북은 제 열에 잎을 깐다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    put(board, 2, 1, {
      kind: 'turtle',
      layers: 1,
      moving: true,
      move: 'down',
      spreads: { kind: 'leaf', layer: 'ground', shape: 'column' },
    });

    const effect = golemHook()(board, rng());
    expect(effect).not.toBeNull();

    const after = effect!.board;
    expect(at(after, 2, 1).blocker).toBeNull();
    // 제 열 전체 - 사방 3x3이 아니다.
    for (let r = 0; r < 3; r++) expect(at(after, r, 1).ground?.kind).toBe('leaf');
    expect(at(after, 0, 0).ground).toBeNull();
  });
});

describe('앞을 치워야 열리는 장애물', () => {
  const level = () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
      Y R G B
    `);
    put(board, 1, 1, { kind: 'tombstone', layers: 2, requires: 'ghost' });
    return board;
  };

  it('지키는 것이 살아 있으면 겹이 안 깎인다', () => {
    const board = put(level(), 3, 3, { kind: 'ghost', layers: 1 });
    const { board: after, events } = clearNextTo(board, 1, 0);

    expect(at(after, 1, 1).blocker?.layers).toBe(2);
    expect(events.some(e => e.kind === 'tombstone')).toBe(false);
  });

  it('지키는 것이 사라지면 그때부터 통한다', () => {
    const { board: after } = clearNextTo(level(), 1, 0);
    expect(at(after, 1, 1).blocker?.layers).toBe(1);
  });

  it('판 어디에 있든 지킨다 - 붙어 있을 필요가 없다', () => {
    const board = put(level(), 0, 3, { kind: 'ghost', layers: 1 });
    const { board: after } = clearNextTo(board, 1, 0);
    expect(at(after, 1, 1).blocker?.layers).toBe(2);
  });
});

describe('여러 칸에 걸친 장애물', () => {
  const serpent = () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
      Y R G B
    `);
    put(board, 1, 1, { kind: 'serpent-head', layers: 1, group: 'serpent', weak: true });
    put(board, 1, 2, { kind: 'serpent-body', layers: 5, group: 'serpent' });
    put(board, 1, 3, { kind: 'serpent-body', layers: 5, group: 'serpent' });
    return board;
  };

  it('몸통은 때려도 안 통한다', () => {
    const { board: after } = clearNextTo(serpent(), 0, 2);
    expect(at(after, 1, 2).blocker?.layers).toBe(5);
  });

  it('머리가 부서지면 몸통까지 무너진다', () => {
    const { board: after, events } = clearNextTo(serpent(), 1, 0);

    expect(at(after, 1, 1).blocker).toBeNull();
    expect(at(after, 1, 2).blocker).toBeNull();
    expect(at(after, 1, 3).blocker).toBeNull();
    // 목표를 세려면 몸통도 "없어졌다"고 알려야 한다.
    expect(events.filter(e => e.kind === 'serpent-body' && e.destroyed)).toHaveLength(2);
  });

  it('약점이 없는 덩어리는 칸마다 따로 깎인다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    put(board, 1, 1, { kind: 'magic-wall', layers: 5, group: 'magic-wall' });
    put(board, 1, 2, { kind: 'magic-wall', layers: 5, group: 'magic-wall' });

    const { board: after } = clearNextTo(board, 0, 1);
    expect(at(after, 1, 1).blocker?.layers).toBe(4);
    expect(at(after, 1, 2).blocker?.layers).toBe(5);
  });
});

describe('부서지며 무언가를 남기는 장애물', () => {
  it('아이템을 떨어뜨린다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    put(board, 1, 1, { kind: 'electro-crate', layers: 1, drops: 'lightball' });

    const { board: after } = clearNextTo(board, 0, 1);
    expect(at(after, 1, 1).blocker).toBeNull();
    expect(at(after, 1, 1).gem?.special).toBe('lightball');
  });

  it('터지면서 주변을 다음 연쇄의 씨앗으로 넘긴다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    put(board, 1, 1, { kind: 'barrel', layers: 1, explodes: 1 });

    const { chain } = clearNextTo(board, 0, 1);
    // 3x3 전부. 판 밖은 빠진다.
    expect(chain.size).toBe(9);
    expect(chain.has('0,0')).toBe(true);
    expect(chain.has('2,2')).toBe(true);
  });
});

describe('붙잡는 덮개', () => {
  it('사슬 낀 보석은 못 옮긴다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 0, 0).cover = { kind: 'chain', layers: 1, locks: true };

    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 0, col: 1 }, rng(), {});
    expect(result.valid).toBe(false);
  });

  it('평범한 덮개는 안 붙잡는다', () => {
    const board = parseBoard(`
      R G R
      G R G
      R G R
    `);
    at(board, 0, 0).cover = { kind: 'roof', layers: 1 };

    // 매치가 되는 수인지와 무관하게, 잠금 때문에 막히지는 않아야 한다.
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, rng(), {});
    expect(result.steps[0]?.kind).toBe('swap');
  });
});

describe('자리를 옮기는 장애물', () => {
  const small = () =>
    parseBoard(`
      R G B Y
      G B Y R
      B Y R G
      Y R G B
    `);

  it('왕복하는 것은 옆으로 한 칸 간다', () => {
    const board = put(small(), 1, 1, {
      kind: 'water-tower',
      layers: 1,
      moving: true,
      move: 'sweep',
      dir: 1,
    });

    const after = golemHook()(board, rng())!.board;
    expect(at(after, 1, 1).blocker).toBeNull();
    expect(at(after, 1, 2).blocker?.kind).toBe('water-tower');
  });

  it('벽에 닿으면 방향만 바꾸고 제자리에 있는다', () => {
    const board = put(small(), 1, 3, {
      kind: 'water-tower',
      layers: 1,
      moving: true,
      move: 'sweep',
      dir: 1,
    });

    const effect = golemHook()(board, rng());
    const after = effect!.board;
    expect(at(after, 1, 3).blocker?.dir).toBe(-1);
  });

  it('순간이동하는 것은 다른 자리로 간다', () => {
    const board = put(small(), 1, 1, {
      kind: 'giant-drill',
      layers: 1,
      moving: true,
      move: 'teleport',
    });

    const after = golemHook()(board, rng())!.board;
    const spots = after.cells.filter(c => c.blocker?.kind === 'giant-drill');
    expect(spots).toHaveLength(1);
    expect(at(after, 1, 1).blocker).toBeNull();
  });
});

describe('가끔만 뱉는 생성 장애물', () => {
  it('네 턴에 한 번만 내놓는다', () => {
    let board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    board = put(board, 1, 1, { kind: 'scarecrow', layers: 1, produces: 'pumpkin', everyN: 4 });

    const hook = producerHook(0);
    const produced: number[] = [];
    for (let turn = 1; turn <= 8; turn++) {
      const effect = hook(board, rng());
      board = effect?.board ?? board;
      if (effect?.effects.some(e => e.kind === 'produced')) produced.push(turn);
    }

    // 충전이 보드에 실려 있으므로 턴을 거듭해도 주기가 유지된다.
    expect(produced).toEqual([4, 8]);
  });
});

describe('레벨을 통해 실제로 도는가', () => {
  /** 축을 단위로 검사하는 것과 별개로, 레벨·부스터를 거친 경로도 한 번 훑는다. */
  const levelOf = (label: string) => {
    const level = TEST_LEVELS.find(l => l.label === label);
    if (!level) throw new Error(`시험 레벨이 없다: ${label}`);
    return level;
  };

  it('망치로 꿀단지를 부수면 판에 꿀이 번진다', () => {
    const state = startLevel(levelOf('꿀단지'), rng());
    const pot = state.board.cells.findIndex(c => c.blocker?.kind === 'honey-pot');
    expect(pot).toBeGreaterThanOrEqual(0);

    const pos = { row: Math.floor(pot / state.board.width), col: pot % state.board.width };
    const result = activateBooster(state.board, pos, 'hammer', rng(), resolveOptionsFor(state.level));

    expect(result.valid).toBe(true);
    expect(result.board.cells.filter(c => c.cover?.kind === 'honey').length).toBeGreaterThan(0);
  });

  it('유령이 남아 있으면 망치로도 묘비가 안 깨진다', () => {
    const state = startLevel(levelOf('묘비'), rng());
    const idx = state.board.cells.findIndex(c => c.blocker?.kind === 'tombstone');
    const pos = { row: Math.floor(idx / state.board.width), col: idx % state.board.width };

    const before = state.board.cells[idx].blocker?.layers;
    const result = activateBooster(state.board, pos, 'hammer', rng(), resolveOptionsFor(state.level));
    expect(result.board.cells[idx].blocker?.layers).toBe(before);
  });
});

describe('다시 자라는 장애물', () => {
  const withMushrooms = () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
      Y R G B
    `);
    // 버섯은 늘 흙 위에 있다. 다시 자랄 자리가 그 흙이다.
    [
      [1, 1],
      [2, 2],
    ].forEach(([r, c]) => {
      put(board, r, c, { kind: 'mushroom', layers: 1 });
      at(board, r, c).ground = { kind: 'soil', layers: 1 };
    });
    at(board, 3, 3).ground = { kind: 'soil', layers: 1 };
    return board;
  };

  const hook = regrowHook('mushroom', 'soil');

  it('이번 턴에 하나도 못 없앴으면 흙 위에 하나가 되살아난다', () => {
    const board = withMushrooms();
    const before = board.cells.filter(c => c.blocker?.kind === 'mushroom').length;

    const effect = hook(board, rng(), { damage: [] });
    expect(effect).not.toBeNull();
    expect(effect!.board.cells.filter(c => c.blocker?.kind === 'mushroom').length).toBe(before + 1);
  });

  it('하나라도 없앤 턴에는 안 자란다', () => {
    const effect = hook(withMushrooms(), rng(), {
      damage: [{ key: '1,1', kind: 'mushroom', target: 'blocker', destroyed: true }],
    });
    expect(effect).toBeNull();
  });

  it('겹만 깎고 못 없앤 턴에는 자란다 - 없앤 것과 때린 것은 다르다', () => {
    const effect = hook(withMushrooms(), rng(), {
      damage: [{ key: '1,1', kind: 'mushroom', target: 'blocker', destroyed: false }],
    });
    expect(effect).not.toBeNull();
  });

  it('판에서 다 치웠으면 되살아나지 않는다', () => {
    // 안 그러면 목표를 채운 순간 다시 생겨서 영영 못 끝낸다.
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 1, 1).ground = { kind: 'soil', layers: 1 };

    expect(hook(board, rng(), { damage: [] })).toBeNull();
  });

  it('흙이 없으면 자랄 자리가 없다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    put(board, 1, 1, { kind: 'mushroom', layers: 1 });

    expect(hook(board, rng(), { damage: [] })).toBeNull();
  });
});

describe('번지는 바닥', () => {
  /** 씨앗 한 칸에서 시작한다 */
  const seeded = () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
      Y R G B
    `);
    at(board, 1, 1).ground = { kind: 'jelly', layers: 1, spreads: true };
    return board;
  };

  it('옆 칸이 터지면 그리로 번진다', () => {
    const { board: after, events } = applyDamage(seeded(), new Set(['1,2']));

    expect(at(after, 1, 2).ground?.kind).toBe('jelly');
    expect(at(after, 1, 2).ground?.spreads).toBe(true);
    // 벗겨진 게 아니라 넓어진 것이라 다른 종류의 사건이다.
    expect(events).toContainEqual({
      key: '1,2',
      kind: 'jelly',
      target: 'spread',
      destroyed: false,
    });
  });

  it('씨앗 칸은 터져도 벗겨지지 않는다', () => {
    const { board: after, events } = applyDamage(seeded(), new Set(['1,1']));

    expect(at(after, 1, 1).ground?.kind).toBe('jelly');
    expect(events.some(e => e.target === 'ground')).toBe(false);
  });

  it('한 수에 한 칸씩만 넓어진다', () => {
    // 이번에 번진 칸을 다시 씨앗으로 삼으면 한 수에 판을 가로지른다.
    const { board: after } = applyDamage(seeded(), new Set(['1,2', '1,3']));

    expect(at(after, 1, 2).ground?.kind).toBe('jelly');
    expect(at(after, 1, 3).ground).toBeNull();
  });

  it('닿지 않은 칸에는 안 번진다', () => {
    const { board: after } = applyDamage(seeded(), new Set(['3,3']));
    expect(at(after, 3, 3).ground).toBeNull();
  });

  it('젤리폭탄이 깨지면 쏟아진 젤리도 번진다', () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
      Y R G B
    `);
    put(board, 1, 1, {
      kind: 'jelly-bomb',
      layers: 1,
      powerUpOnly: true,
      spreads: { kind: 'jelly', layer: 'ground', radius: 1, grows: true },
    });

    // 아이템으로만 깨진다 - 그래서 blastCells 로 넘긴다.
    const { board: after } = applyDamage(board, new Set(['1,0']), new Set(['1,0']));

    const jellied = after.cells.filter(c => c.ground?.kind === 'jelly');
    expect(jellied.length).toBeGreaterThan(0);
    expect(jellied.every(c => c.ground?.spreads)).toBe(true);
  });

  it('덮는 목표는 남은 칸이 줄어드는 쪽으로 센다', () => {
    const goal = { kind: 'spread' as const, groundKind: 'jelly', count: 10 };
    const before = countOnBoard(seeded(), goal);

    const { board: after } = applyDamage(seeded(), new Set(['1,2']));
    expect(countOnBoard(after, goal)).toBe(before - 1);
  });
});

describe('붙잡힌 보석과 중력', () => {
  const chained = () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 1, 1).cover = { kind: 'chain', layers: 1, locks: true };
    return board;
  };

  it('아래가 비어도 떨어지지 않는다', () => {
    const board = chained();
    const held = at(board, 1, 1).gem!.id;

    const { board: after } = applyGravity(board, new Set(['2,1']), rng());
    expect(at(after, 1, 1).gem?.id).toBe(held);
    expect(at(after, 1, 1).cover?.kind).toBe('chain');
  });

  it('사슬이 다른 보석을 대신 붙잡지 않는다', () => {
    // 보석만 빠져나가고 사슬이 남으면, 위에서 내려온 엉뚱한 보석이 묶인다.
    const board = chained();
    const held = at(board, 1, 1).gem!.id;

    const { board: after } = applyGravity(board, new Set(['2,1']), rng());
    const where = after.cells.findIndex(c => c.gem?.id === held);
    expect(where).toBe(1 * after.width + 1);
  });

  it('아래 빈칸은 대각선으로 메워진다 - 구멍이 남지 않는다', () => {
    const { board: after } = applyGravity(chained(), new Set(['2,1']), rng());
    expect(at(after, 2, 1).gem).not.toBeNull();
  });

  it('평범한 덮개가 씌워진 보석은 떨어진다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 1, 1).cover = { kind: 'roof', layers: 1 };
    const covered = at(board, 1, 1).gem!.id;

    const { board: after } = applyGravity(board, new Set(['2,1']), rng());
    expect(at(after, 2, 1).gem?.id).toBe(covered);
  });

  it('골렘도 붙잡힌 보석은 못 밀어낸다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 1, 1).cover = { kind: 'chain', layers: 1, locks: true };
    put(board, 0, 1, { kind: 'golem', layers: 3, moving: true });

    const effect = golemHook()(board, rng());
    // 막혀서 못 내려온다 - 보드가 안 바뀐다.
    expect(effect).toBeNull();
  });
});

describe('아이템으로만 벗겨지는 덮개', () => {
  const chainedBoard = () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 1, 1).cover = { kind: 'chain', layers: 1, locks: true, powerUpOnly: true };
    return board;
  };

  it('일반 매치로는 한 겹도 안 깎인다', () => {
    const { board: after, events, shielded } = applyDamage(chainedBoard(), new Set(['1,1']));

    expect(at(after, 1, 1).cover?.layers).toBe(1);
    expect(events.some(e => e.target === 'cover')).toBe(false);
    // 그래도 보석은 살아남는다 - 막아낸 것이지 통과시킨 게 아니다.
    expect(shielded.has('1,1')).toBe(true);
  });

  it('폭발에는 끊긴다', () => {
    const { board: after, events } = applyDamage(
      chainedBoard(),
      new Set(['1,1']),
      new Set(['1,1']),
    );

    expect(at(after, 1, 1).cover).toBeNull();
    expect(events).toContainEqual({ key: '1,1', kind: 'chain', target: 'cover', destroyed: true });
  });

  it('평범한 덮개는 일반 매치로도 깎인다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 1, 1).cover = { kind: 'roof', layers: 2 };

    const { board: after } = applyDamage(board, new Set(['1,1']));
    expect(at(after, 1, 1).cover?.layers).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import { at, isPlayable } from '../engine/board';
import { findMatchGroups } from '../engine/match';
import { resolveTurn, listMoves } from '../engine/resolve';
import { applyGravity } from '../engine/gravity';
import { makeRng } from '../engine/rng';
import { newBoard, playGame } from '../bot/bot';
import type { Board } from '../engine/types';
import type { TurnStep } from '../engine/resolve';

/**
 * 불변식 테스트. 규칙 하나하나를 확인하는 골든 테스트와 달리, "무슨 수를 두든
 * 절대 깨지면 안 되는 성질"을 수천 판 돌려서 검사한다.
 *
 * 자동 루프에 일을 맡길 때 이게 안전망이다. 골든 테스트는 아는 규칙만 지키고,
 * 이건 "모르는 사이에 망가진 것"을 잡는다.
 */

/** 재생 가능한 칸은 항상 보석으로 차 있고, id는 겹치지 않는다. */
function assertBoardSound(board: Board, context: string) {
  const ids = new Set<number>();
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = at(board, r, c);
      if (!isPlayable(cell)) continue;
      expect(cell.gem, `${context}: (${r},${c})이 비어 있다`).not.toBeNull();
      const id = cell.gem!.id;
      expect(ids.has(id), `${context}: id ${id}이 중복된다`).toBe(false);
      ids.add(id);
    }
  }
}

describe('불변식 - 보드', () => {
  it('처음 만든 보드에는 매치가 없다', () => {
    for (let seed = 0; seed < 200; seed++) {
      const board = newBoard(9, 9, makeRng(seed));
      expect(findMatchGroups(board), `시드 ${seed}`).toHaveLength(0);
    }
  }, 60_000);

  it('어떤 수를 두어도 보드가 온전하다', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      const result = playGame(board, rng, { maxMoves: 40, strategy: 'random' });
      assertBoardSound(result.board, `시드 ${seed}`);
    }
  }, 60_000);

  it('턴이 끝난 보드에는 처리되지 않은 매치가 남지 않는다', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = makeRng(seed);
      let board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 30,
        strategy: 'random',
        onTurn: (_result, next) => {
          board = next;
          expect(findMatchGroups(board), `시드 ${seed}`).toHaveLength(0);
        },
      });
    }
  }, 60_000);
});

describe('불변식 - 낙하', () => {
  it('같은 열에서 위에 있던 보석이 아래 보석을 추월하지 않는다', () => {
    // 낙하 애니메이션이 겹쳐 보이는 버그는 대개 여기서 시작된다.
    for (let seed = 0; seed < 30; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 30,
        strategy: 'random',
        onTurn: result => {
          result.steps.forEach(step => {
            if (step.kind !== 'fall') return;
            const byCol = new Map<number, typeof step.moves>();
            step.moves.forEach(m => {
              const list = byCol.get(m.col) ?? [];
              list.push(m);
              byCol.set(m.col, list);
            });
            byCol.forEach(moves => {
              const sorted = [...moves].sort((x, y) => x.fromRow - y.fromRow);
              for (let i = 1; i < sorted.length; i++) {
                expect(
                  sorted[i].toRow,
                  `시드 ${seed}: 위에 있던 보석이 아래로 추월했다`,
                ).toBeGreaterThan(sorted[i - 1].toRow);
              }
            });
          });
        },
      });
    }
  }, 60_000);

  it('리필은 아이템을 달고 있는 보석을 만들지 않는다', () => {
    // 턴 전체가 아니라 applyGravity 하나만 본다. 최종 보드를 보면 안 되는 이유:
    // 갓 떨어진 보석이 다음 연쇄에서 4매치를 이뤄 정당하게 아이템이 될 수 있다.
    for (let seed = 0; seed < 50; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      const cleared = new Set<string>();
      for (let c = 0; c < board.width; c++) {
        for (let r = 0; r < 4; r++) cleared.add(`${r},${c}`);
      }
      const { board: after, moves } = applyGravity(board, cleared, rng);
      moves
        .filter(m => m.spawned)
        .forEach(m => {
          const cell = at(after, m.toRow, m.col);
          expect(cell.gem?.id, `시드 ${seed}`).toBe(m.id);
          expect(cell.gem?.special, `시드 ${seed}`).toBeUndefined();
        });
    }
  }, 60_000);
});

describe('불변식 - 아이템', () => {
  it('이번 판에 생긴 아이템은 이번 판에 터지지 않는다', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 40,
        strategy: 'random',
        onTurn: result => {
          result.steps.forEach(step => {
            if (step.kind !== 'clear') return;
            const cleared = new Set(step.cells);
            step.spawned.forEach(s => {
              expect(cleared.has(s.key), `시드 ${seed}: 갓 생긴 아이템이 같이 터졌다`).toBe(false);
            });
          });
        },
      });
    }
  }, 60_000);

  it('한 매치에서 아이템이 두 개 이상 생기지 않는다', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 40,
        strategy: 'random',
        onTurn: result => {
          result.steps.forEach(step => {
            if (step.kind !== 'clear') return;
            const keys = step.spawned.map(s => s.key);
            expect(new Set(keys).size, `시드 ${seed}`).toBe(keys.length);
          });
        },
      });
    }
  }, 60_000);
});

describe('불변식 - 진행', () => {
  it('연쇄는 반드시 끝난다', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 40,
        strategy: 'random',
        onTurn: result => {
          const clears = result.steps.filter((s: TurnStep) => s.kind === 'clear').length;
          // 50연쇄는 정상 플레이에서 나올 수 없다. 나오면 규칙에 순환이 있다.
          expect(clears, `시드 ${seed}`).toBeLessThan(50);
        },
      });
    }
  }, 60_000);

  it('둘 수 있다고 알려준 수는 반드시 유효하다', () => {
    // listMoves(UI가 힌트로 쓰는 것)와 resolveTurn(실제 규칙)이 어긋나면
    // "눌러도 아무 일 없는 칸"이 생긴다. playGame이 이걸 던진다.
    for (let seed = 0; seed < 30; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      expect(() => playGame(board, rng, { maxMoves: 40, strategy: 'random' })).not.toThrow();
    }
  }, 60_000);

  it('리셔플 없이도 대부분의 판은 끝까지 굴러간다', () => {
    let stuck = 0;
    for (let seed = 0; seed < 50; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      const result = playGame(board, rng, { maxMoves: 30, strategy: 'random' });
      if (result.endedBy === 'stuck') stuck++;
    }
    expect(stuck).toBe(0);
  }, 60_000);
});

describe('결정성', () => {
  it('같은 시드로 두 번 돌리면 완전히 같은 판이 나온다', () => {
    const run = () => {
      const rng = makeRng(999);
      const board = newBoard(9, 9, rng);
      const steps: string[] = [];
      playGame(board, rng, {
        maxMoves: 25,
        strategy: 'random',
        onTurn: result => steps.push(JSON.stringify(result.steps)),
      });
      return steps.join('|');
    };
    expect(run()).toBe(run());
  }, 60_000);

  it('시드가 다르면 다른 판이 나온다', () => {
    const run = (seed: number) => {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      return playGame(board, rng, { maxMoves: 25, strategy: 'random' }).clearedTotal;
    };
    expect(run(1)).not.toBe(run(2));
  }, 60_000);
});

describe('봇', () => {
  it('greedy가 random보다 많이 터뜨린다', () => {
    const total = (strategy: 'random' | 'greedy') => {
      let sum = 0;
      for (let seed = 0; seed < 20; seed++) {
        const rng = makeRng(seed);
        const board = newBoard(9, 9, rng);
        sum += playGame(board, rng, { maxMoves: 25, strategy }).clearedTotal;
      }
      return sum;
    };
    expect(total('greedy')).toBeGreaterThan(total('random'));
  }, 60_000);

  it('둘 수 있는 수가 보드마다 충분히 있다', () => {
    for (let seed = 0; seed < 30; seed++) {
      const board = newBoard(9, 9, makeRng(seed));
      expect(listMoves(board).length, `시드 ${seed}`).toBeGreaterThan(0);
    }
  }, 60_000);
});

describe('무효 수', () => {
  it('무효한 스왑은 보드를 바꾸지 않는다', () => {
    const rng = makeRng(3);
    const board = newBoard(9, 9, rng);
    const before = JSON.stringify(board);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 8; c++) {
        const result = resolveTurn(board, { row: r, col: c }, { row: r, col: c + 1 }, makeRng(1));
        if (!result.valid) expect(JSON.stringify(result.board)).toBe(before);
      }
    }
  }, 60_000);
});

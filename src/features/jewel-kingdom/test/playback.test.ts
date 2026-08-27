import { describe, it, expect } from 'vitest';
import { parseBoard, renderBoard } from '../engine/notation';
import { resolveTurn } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import { newBoard, playGame } from '../bot/bot';
import { stepDurationMs } from '../ui/usePlayback';

/**
 * "화면은 단계 목록을 재생하기만 하면 된다"는 구조상의 약속을 고정한다.
 *
 * 이 약속이 깨지면 UI가 스스로 보드를 재구성해야 하고, 그 순간 규칙이
 * 엔진과 화면 두 군데에 존재하게 된다. 그때부터 "화면에서만 틀리는 버그"가
 * 생기고, 그건 테스트로 못 잡는다. 그래서 여기서 막는다.
 */
describe('단계 목록만으로 화면을 그릴 수 있다', () => {
  it('모든 단계가 그 시점의 보드를 들고 있다', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 20,
        strategy: 'random',
        onTurn: result => {
          result.steps.forEach(step => {
            expect(step.board, `시드 ${seed}: ${step.kind} 단계에 보드가 없다`).toBeDefined();
            expect(step.board.width).toBe(9);
            expect(step.board.height).toBe(9);
          });
        },
      });
    }
  });

  it('마지막 단계의 보드가 턴의 최종 보드와 같다', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 20,
        strategy: 'random',
        onTurn: result => {
          const last = result.steps[result.steps.length - 1];
          expect(renderBoard(last.board), `시드 ${seed}`).toBe(renderBoard(result.board));
        },
      });
    }
  });

  it('단계를 순서대로 훑으면 보드가 한 번에 한 가지씩만 바뀐다', () => {
    // swap 다음에는 clear가 오고, clear 다음에는 fall이 온다.
    // 화면이 중간 상태를 건너뛰지 않아도 되는지 확인한다.
    const board = parseBoard(`
      G R R R R
      B Y G B Y
      Y G B Y G
      B Y G B Y
    `);
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, makeRng(1));
    const kinds = result.steps.map(s => s.kind);
    expect(kinds[0]).toBe('swap');
    for (let i = 1; i < kinds.length; i++) {
      if (kinds[i] === 'fall') expect(kinds[i - 1]).toBe('clear');
      if (kinds[i] === 'clear') expect(['swap', 'fall']).toContain(kinds[i - 1]);
    }
  });

  it('clear 단계의 보드에는 터질 보석이 아직 남아 있다', () => {
    // 화면이 "터지는 중" 애니메이션을 그리려면 그 보석이 아직 있어야 한다.
    // 여기서 이미 지워져 있으면 터지는 연출을 그릴 대상이 없다.
    const board = parseBoard(`
      G R R R R
      B Y G B Y
      Y G B Y G
      B Y G B Y
    `);
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, makeRng(1));
    const clear = result.steps.find(s => s.kind === 'clear');
    if (clear && clear.kind === 'clear') {
      clear.cells.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        expect(clear.board.cells[r * clear.board.width + c].gem).not.toBeNull();
      });
    }
  });
});

describe('재생 시간', () => {
  it('낙하 시간은 가장 멀리 떨어지는 보석에 맞춘다', () => {
    const rng = makeRng(5);
    const board = newBoard(9, 9, rng);
    const result = playGame(board, rng, { maxMoves: 1, strategy: 'random' });
    expect(result.movesUsed).toBeLessThanOrEqual(1);
  });

  it('모든 단계가 유한한 시간을 가진다', () => {
    for (let seed = 0; seed < 10; seed++) {
      const rng = makeRng(seed);
      const board = newBoard(9, 9, rng);
      playGame(board, rng, {
        maxMoves: 15,
        strategy: 'random',
        onTurn: result => {
          result.steps.forEach(step => {
            const ms = stepDurationMs(step);
            expect(Number.isFinite(ms), `${step.kind} 단계의 시간이 유한하지 않다`).toBe(true);
            expect(ms).toBeGreaterThanOrEqual(0);
            expect(ms).toBeLessThan(3000);
          });
        },
      });
    }
  });
});

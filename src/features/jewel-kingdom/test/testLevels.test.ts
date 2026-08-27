import { describe, expect, it } from 'vitest';
import { ELEMENTS } from '../data/elements';
import { TEST_LEVELS, TEST_LEVEL_BASE, testLevelElement } from '../data/testLevels';
import { LEVELS } from '../data/levels';
import { startLevel } from '../engine/level';
import { makeRng } from '../engine/rng';
import { countOnBoard } from '../engine/goals';
import { playLevel } from '../bot/bot';

/**
 * 시험 레벨은 카탈로그에서 만들어 낸다. 그래서 "표에 줄을 넣었는데 판이 안 만들어진다"
 * 거나 "만들어진 판의 목표가 애초에 달성 불가능하다"는 게 조용히 지나갈 수 있다.
 * 여기서 전부 실제로 시작해 보고, 봇에게 끝까지 두게 해서 막히지 않는지 본다.
 */
describe('요소별 시험 레벨', () => {
  it('카탈로그 요소마다 하나씩 있다', () => {
    expect(TEST_LEVELS).toHaveLength(ELEMENTS.length);
    ELEMENTS.forEach((def, i) => {
      expect(testLevelElement(TEST_LEVEL_BASE + i)?.id).toBe(def.id);
    });
  });

  it('본 레벨과 번호가 겹치지 않는다', () => {
    const ids = new Set(LEVELS.map(l => l.id));
    TEST_LEVELS.forEach(l => expect(ids.has(l.id)).toBe(false));
  });

  TEST_LEVELS.forEach((level, i) => {
    const def = ELEMENTS[i];

    it(`${def.label}: 판이 만들어지고 목표가 판 위에 있다`, () => {
      const state = startLevel(level, makeRng(1234 + i));
      expect(state.board.width).toBeGreaterThan(0);

      // 시작하자마자 달성돼 있으면 그 요소를 볼 기회가 없다.
      level.goals.forEach((goal, gi) => {
        if (goal.kind === 'color' || goal.kind === 'collect') return;
        expect(countOnBoard(state.board, goal), `${def.label} 목표 ${gi}`).toBeGreaterThan(0);
      });
    });

    it(`${def.label}: 봇이 끝까지 둘 수 있다`, () => {
      // 이기는 것까지 요구하지 않는다 - 어떤 요소는 봇이 못 푸는 게 정상이다
      // (강철은 아이템이 있어야 하고, 봇은 부스터를 안 쓴다).
      // 여기서 잡고 싶은 건 "두다가 판이 멈추거나 터진다"는 쪽이다.
      const result = playLevel(level, makeRng(7000 + i));
      expect(result.movesUsed).toBeGreaterThan(0);
      expect(result.progress).toHaveLength(level.goals.length);
    });
  });
});

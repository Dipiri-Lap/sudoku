import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at } from '../engine/board';
import { applyDamage } from '../engine/damage';
import {
  ELEMENTS,
  elementById,
  elementsByCategory,
  unverifiedElements,
} from '../data/elements';

/**
 * 카탈로그가 "축 조합의 목록"으로서 성립하는지 검사한다.
 *
 * 요소 하나하나의 동작은 이미 축 단위로 검증돼 있다(layers.test / obstacles.test).
 * 여기서 볼 것은 **표에 적은 조합이 실제로 그 축을 만들어내는가**다.
 * 표만 고쳐서 새 요소를 추가할 수 있다는 게 이 구조의 약속이므로,
 * 그 약속이 깨지면 여기서 걸려야 한다.
 */
describe('장애물 카탈로그', () => {
  it('id가 겹치지 않는다', () => {
    const ids = ELEMENTS.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 요소를 대괄호 표기로 읽을 수 있다', () => {
    ELEMENTS.forEach(def => {
      const board = parseBoard(`[${def.id}] R G`);
      expect(board.width, def.id).toBe(3);
      const cell = at(board, 0, 0);
      // 벽·컨베이어·전격은 칸에 놓이는 게 아니라 레벨이 따로 거는 것들이다
      const placesSomething =
        cell.blocker !== null ||
        cell.cover !== null ||
        cell.ground !== null ||
        cell.collector !== null ||
        cell.spawner !== null;
      const isLevelWide = ['wall', 'conveyor', 'tesla', 'laser', 'fireworks'].includes(def.id);
      expect(placesSomething || isLevelWide, `${def.id}이 칸에 아무것도 놓지 않는다`).toBe(true);
    });
  });

  it('겹 수를 지정할 수 있다', () => {
    const board = parseBoard('[box:4] R G');
    expect(at(board, 0, 0).blocker?.layers).toBe(4);
  });

  it('그릇은 색과 개수를 함께 지정할 수 있다', () => {
    const board = parseBoard('[shelf:B5] R G');
    const box = at(board, 0, 0).collector;
    expect(box?.color).toBe(2); // B
    expect(box?.need).toBe(5);
  });

  it('카탈로그에 없는 이름은 에러를 낸다', () => {
    expect(() => parseBoard('[없는것] R G')).toThrow(/카탈로그에 없는/);
  });

  it('대괄호가 안 닫히면 에러를 낸다', () => {
    expect(() => parseBoard('[box R G')).toThrow(/닫혔/);
  });
});

describe('분류별 축이 맞게 붙는다', () => {
  it('하단 레이어는 ground를 만든다', () => {
    elementsByCategory('lower').forEach(def => {
      const cell = at(parseBoard(`[${def.id}] R G`), 0, 0);
      expect(cell.ground, def.id).not.toBeNull();
      expect(cell.cover, def.id).toBeNull();
    });
  });

  it('상단 레이어는 cover를 만들고 보석을 살려둔다', () => {
    elementsByCategory('upper').forEach(def => {
      const cell = at(parseBoard(`[${def.id}] R G`), 0, 0);
      expect(cell.cover, def.id).not.toBeNull();
      expect(cell.blocker, def.id).toBeNull();
    });
  });

  it('그릇은 collector를 만든다', () => {
    elementsByCategory('container')
      .filter(d => d.id !== 'conveyor')
      .forEach(def => {
        const cell = at(parseBoard(`[${def.id}] R G`), 0, 0);
        expect(cell.collector, def.id).not.toBeNull();
      });
  });

  it('생성 요소는 produces가 붙은 장애물이다', () => {
    elementsByCategory('generator').forEach(def => {
      const cell = at(parseBoard(`[${def.id}] R G`), 0, 0);
      expect(cell.blocker?.produces, def.id).toBeTruthy();
      expect(def.hook, def.id).toBe('producer');
    });
  });

  it('막는 장애물은 칸을 차지하고 보석을 밀어낸다', () => {
    elementsByCategory('blocker').forEach(def => {
      const cell = at(parseBoard(`[${def.id}] R G`), 0, 0);
      expect(cell.blocker, def.id).not.toBeNull();
      expect(cell.gem, def.id).toBeNull();
    });
  });
});

describe('표에 적은 특성이 실제로 동작한다', () => {
  it('강철은 일반 매치로 안 부서지고 폭발로만 부서진다', () => {
    const board = parseBoard('[steel] R R R');
    expect(applyDamage(board, new Set(['0,1']), new Set()).events).toEqual([]);
    expect(applyDamage(board, new Set(['0,1']), new Set(['0,1'])).events).toHaveLength(1);
  });

  it('통나무는 떨어지는 장애물이다', () => {
    expect(at(parseBoard('[log] R G'), 0, 0).blocker?.fallsOut).toBe(true);
  });

  it('고대금고는 숨어 있다', () => {
    expect(at(parseBoard('[vault] R G'), 0, 0).blocker?.hidden).toBe(true);
  });

  it('방패 구조물은 방패를 가진다', () => {
    expect(at(parseBoard('[bastion] R G'), 0, 0).blocker?.shield).toBe(1);
  });

  it('거대 골렘은 쪼개진다', () => {
    const b = at(parseBoard('[giant-golem] R G'), 0, 0).blocker;
    expect(b?.moving).toBe(true);
    expect(b?.splitsInto?.count).toBe(2);
  });

  it('빨강자물쇠는 빨강으로만 열린다', () => {
    expect(at(parseBoard('[red-lock] R G'), 0, 0).blocker?.color).toBe(0);
  });

  it('금속관은 투입구를 만든다', () => {
    expect(at(parseBoard('[tube:B] R G'), 0, 0).spawner?.color).toBe(2);
  });
});

describe('확인이 남은 것들', () => {
  it('아직 확인 못 한 요소가 목록으로 남아 있다', () => {
    // 이 목록이 "레퍼런스를 플레이하며 확정할 것"의 실체다.
    const pending = unverifiedElements();
    expect(pending.length).toBeGreaterThan(0);
    pending.forEach(e => expect(e.note.length, e.id).toBeGreaterThan(0));
  });

  it('확인된 요소는 설명이 구체적이다', () => {
    ELEMENTS.filter(e => e.verified).forEach(e => {
      expect(e.note.length, e.id).toBeGreaterThan(5);
    });
  });

  it('id로 찾을 수 있다', () => {
    expect(elementById('golem')?.label).toBe('골렘');
    expect(elementById('없는것')).toBeUndefined();
  });
});

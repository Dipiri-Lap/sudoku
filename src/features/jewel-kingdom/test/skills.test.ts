import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at } from '../engine/board';
import { makeRng } from '../engine/rng';
import { activateSkill } from '../engine/resolve';
import {
  SKILLS,
  chargeSkills,
  isSkillReady,
  nextSlotLevel,
  sanitizeSkills,
  skillSlotsFor,
} from '../engine/skills';

const FILLER = `
  R G B Y P O R
  G B Y P O R G
  B Y P O R G B
  Y P O R G B Y
  P O R G B Y P
  O R G B Y P O
  R G B Y P O R`;

describe('스킬', () => {
  it('칸은 레벨 1에 하나, 6에 둘, 12에 셋 열린다', () => {
    expect(skillSlotsFor(1)).toBe(1);
    expect(skillSlotsFor(5)).toBe(1);
    expect(skillSlotsFor(6)).toBe(2);
    expect(skillSlotsFor(12)).toBe(3);
    expect(nextSlotLevel(3)).toBe(6);
    expect(nextSlotLevel(20)).toBeNull();
  });

  it('저장값을 정리한다: 모르는 종류·중복·기본 아이템은 버리고 칸 수만큼 자른다', () => {
    expect(sanitizeSkills(['plow', 'plow', 'tnt', 'nope', 'sickle', 'ladybug'], 2)).toEqual(['plow', 'sickle']);
    expect(sanitizeSkills(null, 3)).toEqual(['butterfly']);
  });

  it('게이지는 지운 칸만큼 장착한 스킬 모두에 차고, 비용에서 멈춘다', () => {
    let g = chargeSkills({}, ['butterfly', 'plow'], 12);
    expect(g).toEqual({ butterfly: 12, plow: 12 });
    g = chargeSkills(g, ['butterfly', 'plow'], 30);
    expect(g.butterfly).toBe(20); // 제비 비용
    expect(isSkillReady(g, 'butterfly')).toBe(true);
    expect(isSkillReady(g, 'plow')).toBe(false);
  });

  it('세기가 셀수록 비싸다: 쟁기가 낫·제비보다 비싸다', () => {
    const cost = (k: string) => SKILLS.find(s => s.kind === k)!.cost;
    expect(cost('plow')).toBeGreaterThan(cost('sickle'));
    expect(cost('sickle')).toBeGreaterThanOrEqual(cost('butterfly'));
  });

  it('모든 스킬이 지목한 칸에서 발동해 판이 온전하게 끝난다', () => {
    SKILLS.forEach(skill => {
      const result = activateSkill(parseBoard(FILLER), { row: 3, col: 3 }, skill.kind, makeRng(5));
      expect(result.valid).toBe(true);
      expect(result.clearedCount).toBeGreaterThan(0);
      result.board.cells.forEach(c => {
        if (c.exists && !c.blocker) expect(c.gem).not.toBeNull();
      });
    });
  });

  it('장애물 칸에는 쓸 수 없다', () => {
    const board = parseBoard(FILLER);
    at(board, 3, 3).blocker = { kind: 'box', layers: 1 };
    expect(activateSkill(board, { row: 3, col: 3 }, 'plow', makeRng(1)).valid).toBe(false);
  });
});

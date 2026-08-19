import { describe, it, expect } from 'vitest';
import { encodeLevel, decodeLevel } from './codec';
import { generateLevelForDifficulty, type Difficulty } from '../utils/generator';

describe('스테이지 인코딩', () => {
  it('생성한 레벨을 왕복해도 원본과 같다', () => {
    for (const d of ['lv1', 'lv5', 'lv8', 'lv11'] as Difficulty[]) {
      for (let i = 0; i < 5; i++) {
        const level = generateLevelForDifficulty(d);
        expect(level).not.toBeNull();
        expect(decodeLevel(encodeLevel(level!))).toEqual(level);
      }
    }
  });

  it('인덱스에 구분자와 같은 36진수 문자가 들어가도 깨지지 않는다', () => {
    // 인덱스 11·14·23·24 는 36진수로 각각 b·e·n·o — 구분자와 겹치는 자리
    const level = {
      rows: 5, cols: 5,
      cells: [
        { row: 2, col: 1, type: 'num' as const, value: 42 },            // idx 11 = 'b'
        { row: 2, col: 4, type: 'op' as const, operator: '÷' as const }, // idx 14 = 'e'
        { row: 4, col: 3, type: 'num' as const, value: 7, isBlank: true },// idx 23 = 'n'
        { row: 4, col: 4, type: 'eq' as const },                          // idx 24 = 'o'
      ],
    };
    expect(decodeLevel(encodeLevel(level))).toEqual(level);
  });
});

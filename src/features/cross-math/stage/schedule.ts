import type { Difficulty } from '../utils/generator';

/**
 * 스테이지별 난이도 표.
 *
 * 스테이지 1~5는 튜토리얼 구간으로 개별 지정하고,
 * 6번부터는 100스테이지를 한 블록으로 묶어 5개 단위 패턴을 반복한다.
 * 각 블록 안에서 25/50/75의 배수와 100의 배수는 패턴을 무시하고 승급 관문 난이도로 올린다.
 *
 *   블록      패턴          25·50·75   100
 *   1~100     3,3,4,4,5        6         7
 *   101~200   4,4,5,5,6        7         8
 *   201~300   5,5,6,6,7        8         9
 *   301~400   6,6,7,7,8        9        10
 *   401~500   7,7,8,8,9       10        11
 *   501~600   5,5,6,6,7        8         9
 *   601~700   6,6,7,7,8        9        10
 *   701~800   7,7,8,8,9       10        11
 *   801~900   8,8,9,9,10      11        12
 *   901~1000  9,9,10,10,11    12        12
 *   1001~1100 10,10,11,11,12  13        13   ← 관문은 관문 전용 난이도 lv13(레전드)
 *   1101~1200 11,11,11,12,12  13        13
 *
 * 501번부터는 3항 식(`a○b○c=d`, 7칸)이 섞여 나온다. 새 형식에 적응할 여유를 주려고
 * 숫자 난이도는 한 번 낮추고, 대신 식 형태로 난이도를 올리는 구간이다.
 */

/** 스테이지 1~5 — 개별 지정 구간 */
const INTRO: number[] = [1, 2, 2, 3, 3];

interface Block {
  /** 5개 단위로 반복되는 기본 패턴 */
  pattern: [number, number, number, number, number];
  /** 25·50·75의 배수 */
  quarter: number;
  /** 100의 배수 */
  hundred: number;
}

const BLOCKS: Block[] = [
  { pattern: [3, 3, 4, 4, 5],   quarter: 6,  hundred: 7  }, //   1~100
  { pattern: [4, 4, 5, 5, 6],   quarter: 7,  hundred: 8  }, // 101~200
  { pattern: [5, 5, 6, 6, 7],   quarter: 8,  hundred: 9  }, // 201~300
  { pattern: [6, 6, 7, 7, 8],   quarter: 9,  hundred: 10 }, // 301~400
  { pattern: [7, 7, 8, 8, 9],   quarter: 10, hundred: 11 }, // 401~500
  { pattern: [5, 5, 6, 6, 7],   quarter: 8,  hundred: 9  }, // 501~600
  { pattern: [6, 6, 7, 7, 8],   quarter: 9,  hundred: 10 }, // 601~700
  { pattern: [7, 7, 8, 8, 9],   quarter: 10, hundred: 11 }, // 701~800
  { pattern: [8, 8, 9, 9, 10],  quarter: 11, hundred: 12 }, // 801~900
  { pattern: [9, 9, 10, 10, 11], quarter: 12, hundred: 12 }, //  901~1000
  { pattern: [10, 10, 11, 11, 12], quarter: 13, hundred: 13 }, // 1001~1100
  { pattern: [11, 11, 11, 12, 12], quarter: 13, hundred: 13 }, // 1101~1200
];

/** 3항 식이 처음 등장하는 스테이지 */
export const TRIPLE_FROM = 501;

/**
 * 100단위 블록별 3항 식 비율.
 * 이미 생성해 둔 구간의 값은 "그 데이터가 무엇으로 만들어졌는지"에 대한 기록이기도 하므로,
 * 해당 구간을 다시 생성할 생각이 아니라면 과거 값을 바꾸지 않는다.
 */
const TRIPLE_RATIO_BY_BLOCK: Record<number, number> = {
  5: 0.25, // 501~600 — 새 형식 도입 구간
  6: 0.25, // 601~700
  7: 0.35, // 701~800 — 이후 구간은 숫자 난이도 대신 3항 비중으로 난이도를 올린다
  8: 0.45, // 801~900 — 숫자 난이도가 상한(lv12)에 가까워져 3항 비중이 난이도의 주축이 된다
  9: 0.55, // 901~1000 — 숫자 난이도는 포화. 마지막 구간은 3항 비중으로만 난이도를 올린다
  10: 0.55, // 1001~1100 — 패턴이 상한에 닿아 숫자 난이도가 올랐으므로 비중은 그대로 둔다
  11: 0.55, // 1101~1200
};
const TRIPLE_RATIO_DEFAULT = 0.35;

export const TOTAL_STAGES = BLOCKS.length * 100;

/** 해당 스테이지의 난이도 레벨(1~12)을 돌려준다. */
export function stageLevel(stage: number): number {
  if (stage < 1 || stage > TOTAL_STAGES) {
    throw new Error(`스테이지 범위를 벗어났습니다: ${stage} (1~${TOTAL_STAGES})`);
  }
  if (stage <= INTRO.length) return INTRO[stage - 1];

  const block = BLOCKS[Math.floor((stage - 1) / 100)];
  if (stage % 100 === 0) return block.hundred;
  if (stage % 25 === 0) return block.quarter;
  // 6번부터 5개 주기. (stage - 1) % 5 는 stage 6·101·201… 에서 모두 0이 되어 블록 경계와 어긋나지 않는다.
  return block.pattern[(stage - 1) % 5];
}

export function stageDifficulty(stage: number): Difficulty {
  return `lv${stageLevel(stage)}` as Difficulty;
}

/** 해당 스테이지에서 3항 식을 섞는 비율 (0이면 기존 2항 식만) */
export function stageTripleRatio(stage: number): number {
  if (stage < TRIPLE_FROM) return 0;
  return TRIPLE_RATIO_BY_BLOCK[Math.floor((stage - 1) / 100)] ?? TRIPLE_RATIO_DEFAULT;
}

/** 관문 스테이지(25의 배수) 여부 — 선택 화면에서 강조 표시용 */
export function isMilestone(stage: number): boolean {
  return stage > INTRO.length && stage % 25 === 0;
}

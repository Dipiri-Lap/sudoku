import type { Level } from '../engine/level';
import raw from './generated-levels.json';

/**
 * 자동 생성된 레벨.
 *
 *   npm run generate-jewel-levels          전체
 *   npm run generate-jewel-levels 20 30    그 구간만 (나머지는 그대로 둔다)
 *
 * 이동 횟수는 손으로 고른 값이 아니라 **봇에게 여러 판 시켜서 목표 승률에
 * 맞춘 값**이다. 판마다 winRate/target이 적혀 있어 무엇이 얼마나 어려운지
 * 열어보면 알 수 있다.
 *
 * JSON을 직접 고쳐도 된다 - 다음에 그 구간을 다시 구울 때만 덮어쓰인다.
 */
export interface GeneratedLevel extends Level {
  /** 만들 때 잰 봇 승률 */
  winRate: number;
  /** 맞추려던 승률 */
  target: number;
}

/**
 * 번호를 1000번대로 옮겨 담는다.
 *
 * 손으로 만든 레벨과 번호가 겹치기 때문이다. 화면에 보이는 번호(label)는
 * 원래 번호 그대로라, "12레벨"은 언제나 같은 판이다.
 */
export const GENERATED_LEVELS: GeneratedLevel[] = (
  raw.levels as unknown as GeneratedLevel[]
).map(lv => ({ ...lv, id: 1000 + lv.id, label: String(lv.id) }));

/** 승률을 재느라 판마다 돌린 판 수 */
export const GENERATED_RUNS = raw.runs as number;

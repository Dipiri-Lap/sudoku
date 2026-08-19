import { describe, it, expect } from 'vitest';
import type { CrossMathLevel, GridCell } from '../utils/generator';
import { decodeLevel } from './codec';
import { stageLevel, TOTAL_STAGES, isMilestone, TRIPLE_FROM } from './schedule';
import { extractEquations } from './board';
import { DIFFICULTY_CONFIGS, type Difficulty } from '../utils/generator';

import c1 from '../data/stages/stages-001-100.json';
import c2 from '../data/stages/stages-101-200.json';
import c3 from '../data/stages/stages-201-300.json';
import c4 from '../data/stages/stages-301-400.json';
import c5 from '../data/stages/stages-401-500.json';
import c6 from '../data/stages/stages-501-600.json';
import c7 from '../data/stages/stages-601-700.json';
import c8 from '../data/stages/stages-701-800.json';
import c9 from '../data/stages/stages-801-900.json';
import c10 from '../data/stages/stages-901-1000.json';
import c11 from '../data/stages/stages-1001-1100.json';
import c12 from '../data/stages/stages-1101-1200.json';

const CHUNKS = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12];

function allStages(): Array<{ stage: number; level: CrossMathLevel }> {
  const out: Array<{ stage: number; level: CrossMathLevel }> = [];
  for (const chunk of CHUNKS) {
    chunk.levels.forEach((encoded, i) => {
      out.push({ stage: chunk.from + i, level: decodeLevel(encoded) });
    });
  }
  return out;
}

/**
 * 격자에서 실제 식을 찾아 계산이 맞는지 확인한다.
 *
 * 식은 앞뒤가 빈 "최대 연속 구간"으로만 인정한다. 3항 식 `a○b○c=d` 는 뒷부분에
 * `b○c=d` 모양을 품고 있는데, 그건 별개의 식이 아니라 3항 식의 생김새일 뿐이다.
 * 부분 구간까지 식으로 세면 정상 퍼즐이 전부 오류로 잡힌다.
 */
function checkEquations(level: CrossMathLevel): string[] {
  const at = new Map<string, GridCell>();
  for (const c of level.cells) at.set(`${c.row},${c.col}`, c);
  const errors: string[] = [];

  const apply = (a: number, op: string, b: number): number => {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '×') return a * b;
    return b === 0 ? NaN : a / b;
  };

  /** 구간이 `숫자 연산자 숫자 (연산자 숫자)? 등호 숫자` 모양이면 계산해서 검사한다. */
  const checkRun = (run: GridCell[], where: string) => {
    const len = run.length;
    if (len !== 5 && len !== 7) return;
    const equalsAt = len - 2;
    for (let i = 0; i < len; i++) {
      const want = i % 2 === 0 ? 'num' : i === equalsAt ? 'eq' : 'op';
      if (run[i].type !== want) return;
    }
    let acc = run[0].value!;
    for (let i = 1; i < equalsAt; i += 2) acc = apply(acc, run[i].operator!, run[i + 1].value!);
    if (acc !== run[equalsAt + 1].value) {
      const text = run.map(c => (c.type === 'eq' ? '=' : c.type === 'op' ? c.operator : c.value)).join(' ');
      errors.push(`${where} ${text} (실제 ${acc})`);
    }
  };

  for (const dr of [0, 1] as const) {
    const lines = dr === 0 ? level.rows : level.cols;
    const span = dr === 0 ? level.cols : level.rows;
    for (let line = 0; line < lines; line++) {
      let run: GridCell[] = [];
      let startAt = 0;
      for (let i = 0; i <= span; i++) {
        const cell = i === span ? undefined : at.get(dr === 0 ? `${line},${i}` : `${i},${line}`);
        if (cell) {
          if (run.length === 0) startAt = i;
          run.push(cell);
        } else if (run.length > 0) {
          checkRun(run, `${dr === 0 ? '행' : '열'}${line}@${startAt}`);
          run = [];
        }
      }
    }
  }
  return errors;
}

/** 각 스테이지에 3항 식(7칸)이 몇 개 있는지 센다. */
function tripleRunCount(level: CrossMathLevel): number {
  const at = new Map<string, GridCell>();
  for (const c of level.cells) at.set(`${c.row},${c.col}`, c);
  let n = 0;
  for (const dr of [0, 1] as const) {
    const lines = dr === 0 ? level.rows : level.cols;
    const span = dr === 0 ? level.cols : level.rows;
    for (let line = 0; line < lines; line++) {
      let run = 0;
      for (let i = 0; i <= span; i++) {
        const cell = i === span ? undefined : at.get(dr === 0 ? `${line},${i}` : `${i},${line}`);
        if (cell) run++;
        else { if (run === 7) n++; run = 0; }
      }
    }
  }
  return n;
}

describe('사전 생성 스테이지 데이터', () => {
  const stages = allStages();

  it(`스테이지 1~${TOTAL_STAGES}가 빠짐없이 있다`, () => {
    expect(stages).toHaveLength(TOTAL_STAGES);
    stages.forEach((s, i) => expect(s.stage).toBe(i + 1));
  });

  it('모든 스테이지의 모든 식이 성립한다', () => {
    const broken = stages
      .map(s => ({ stage: s.stage, errors: checkEquations(s.level) }))
      .filter(r => r.errors.length > 0);
    expect(broken).toEqual([]);
  });

  it('모든 스테이지에 채울 빈칸이 있다', () => {
    const empty = stages.filter(s => !s.level.cells.some(c => c.isBlank)).map(s => s.stage);
    expect(empty).toEqual([]);
  });

  it('정답 개수가 난이도별 목표와 정확히 일치한다 (lv1=10 … lv12=21)', () => {
    const wrong = stages
      .map(s => {
        const lv = stageLevel(s.stage);
        const cfg = DIFFICULTY_CONFIGS[`lv${lv}` as Difficulty];
        const blanks = s.level.cells.filter(c => c.isBlank).length;
        return { stage: s.stage, lv, blanks, want: cfg.blankCount };
      })
      .filter(r => r.blanks !== r.want)
      .slice(0, 10);
    expect(wrong).toEqual([]);
  });

  it('난이도별 정답 개수 설정이 9 + 레벨이다', () => {
    for (let lv = 1; lv <= 13; lv++) {
      expect(DIFFICULTY_CONFIGS[`lv${lv}` as Difficulty].blankCount).toBe(9 + lv);
    }
  });

  it('관문(25의 배수)에는 숫자 없이 부호만 있는 식이 여럿 들어 있다', () => {
    // 관문은 fullLineBias 로 생성해 이런 식이 많아야 한다. 일반 스테이지보다 확실히 많은지 본다.
    const countFullBlank = (level: CrossMathLevel) => {
      const at = new Map(level.cells.map(c => [`${c.row},${c.col}`, c]));
      return extractEquations(level).filter(eq => eq.numKeys.every(k => at.get(k)!.isBlank)).length;
    };
    const milestones = stages.filter(s => isMilestone(s.stage));
    const thin = milestones.filter(s => countFullBlank(s.level) < 2).map(s => s.stage);
    expect(thin).toEqual([]);

    const avg = (list: typeof stages) =>
      list.reduce((a, s) => a + countFullBlank(s.level), 0) / list.length;
    const normal = stages.filter(s => !isMilestone(s.stage) && s.stage > 5);
    expect(avg(milestones)).toBeGreaterThan(avg(normal) * 2);
  });

  it('빈칸에는 반드시 정답 값이 들어 있다', () => {
    const bad = stages.filter(s =>
      s.level.cells.some(c => c.isBlank && !Number.isFinite(c.value))
    ).map(s => s.stage);
    expect(bad).toEqual([]);
  });

  it('500번까지는 3항 식이 없다', () => {
    const early = stages.filter(s => s.stage <= 500 && tripleRunCount(s.level) > 0).map(s => s.stage);
    expect(early).toEqual([]);
  });

  it('501번부터는 모든 스테이지에 3항 식이 들어 있다', () => {
    const missing = stages.filter(s => s.stage >= TRIPLE_FROM && tripleRunCount(s.level) === 0).map(s => s.stage);
    expect(missing).toEqual([]);
  });

  it('3항 식의 연산자 두 개는 항상 같은 우선순위 그룹이다', () => {
    // 같은 그룹끼리만 쓰면 왼쪽부터 계산한 값이 곧 수학적 정답이라 해석의 여지가 없다.
    const MUL = new Set(['×', '÷']);
    const bad: string[] = [];
    for (const { stage, level } of stages) {
      const at = new Map<string, GridCell>();
      for (const c of level.cells) at.set(`${c.row},${c.col}`, c);
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        for (const start of level.cells) {
          const run = [0, 1, 2, 3, 4, 5, 6].map(k => at.get(`${start.row + dr * k},${start.col + dc * k}`));
          if (run.some(c => !c)) continue;
          if (at.get(`${start.row - dr},${start.col - dc}`)) continue;
          if (at.get(`${start.row + dr * 7},${start.col + dc * 7}`)) continue;
          const [, op1, , op2] = run as GridCell[];
          if (op1.type !== 'op' || op2.type !== 'op') continue;
          if (MUL.has(op1.operator!) !== MUL.has(op2.operator!)) {
            bad.push(`${stage}: ${op1.operator}${op2.operator}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('격자 크기가 해당 난이도 설정을 넘지 않는다', () => {
    const over = stages.filter(s => {
      const cfg = DIFFICULTY_CONFIGS[`lv${stageLevel(s.stage)}` as Difficulty];
      return s.level.rows > cfg.gridSize || s.level.cols > cfg.gridSize;
    }).map(s => s.stage);
    expect(over).toEqual([]);
  });
});

describe('스테이지 난이도 표', () => {
  it('튜토리얼 구간이 사양대로다', () => {
    expect([1, 2, 3, 4, 5].map(stageLevel)).toEqual([1, 2, 2, 3, 3]);
  });

  it('각 블록의 5개 패턴이 사양대로다', () => {
    expect([6, 7, 8, 9, 10].map(stageLevel)).toEqual([3, 3, 4, 4, 5]);
    expect([101, 102, 103, 104, 105].map(stageLevel)).toEqual([4, 4, 5, 5, 6]);
    expect([201, 202, 203, 204, 205].map(stageLevel)).toEqual([5, 5, 6, 6, 7]);
    expect([301, 302, 303, 304, 305].map(stageLevel)).toEqual([6, 6, 7, 7, 8]);
    expect([401, 402, 403, 404, 405].map(stageLevel)).toEqual([7, 7, 8, 8, 9]);
    expect([501, 502, 503, 504, 505].map(stageLevel)).toEqual([5, 5, 6, 6, 7]);
    expect([601, 602, 603, 604, 605].map(stageLevel)).toEqual([6, 6, 7, 7, 8]);
    expect([701, 702, 703, 704, 705].map(stageLevel)).toEqual([7, 7, 8, 8, 9]);
    expect([801, 802, 803, 804, 805].map(stageLevel)).toEqual([8, 8, 9, 9, 10]);
    expect([901, 902, 903, 904, 905].map(stageLevel)).toEqual([9, 9, 10, 10, 11]);
    expect([1001, 1002, 1003, 1004, 1005].map(stageLevel)).toEqual([10, 10, 11, 11, 12]);
    expect([1101, 1102, 1103, 1104, 1105].map(stageLevel)).toEqual([11, 11, 11, 12, 12]);
  });

  it('25·50·75 관문과 100 관문이 사양대로다', () => {
    expect([25, 50, 75].map(stageLevel)).toEqual([6, 6, 6]);
    expect([125, 150, 175].map(stageLevel)).toEqual([7, 7, 7]);
    expect([225, 250, 275].map(stageLevel)).toEqual([8, 8, 8]);
    expect([325, 350, 375].map(stageLevel)).toEqual([9, 9, 9]);
    expect([425, 450, 475].map(stageLevel)).toEqual([10, 10, 10]);
    expect([525, 550, 575].map(stageLevel)).toEqual([8, 8, 8]);
    expect([625, 650, 675].map(stageLevel)).toEqual([9, 9, 9]);
    expect([725, 750, 775].map(stageLevel)).toEqual([10, 10, 10]);
    expect([825, 850, 875].map(stageLevel)).toEqual([11, 11, 11]);
    expect([925, 950, 975].map(stageLevel)).toEqual([12, 12, 12]);
    // 1001번부터 관문은 관문 전용 난이도 lv13
    expect([1025, 1050, 1075].map(stageLevel)).toEqual([13, 13, 13]);
    expect([1125, 1150, 1175].map(stageLevel)).toEqual([13, 13, 13]);
    expect([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200].map(stageLevel))
      .toEqual([7, 8, 9, 10, 11, 9, 10, 11, 12, 12, 13, 13]);
  });

  it('관문 스테이지는 바로 앞뒤보다 어렵다', () => {
    for (let s = 25; s <= TOTAL_STAGES; s += 25) {
      expect(isMilestone(s)).toBe(true);
      expect(stageLevel(s)).toBeGreaterThan(stageLevel(s - 1));
      if (s < TOTAL_STAGES) expect(stageLevel(s)).toBeGreaterThan(stageLevel(s + 1));
    }
  });
});

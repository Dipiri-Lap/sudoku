import type { Board, GemColor } from './types';
import { at, parseKey } from './board';
import type { TurnResult } from './resolve';
import type { TargetScorer } from './specials';

/**
 * 레벨 목표.
 *
 * 레퍼런스는 점수형이 아니라 목표 달성형이다(SPEC 7.1). 점수는 "많이 터뜨리면
 * 좋다"라서 레벨 설계가 숫자 조절로 끝나지만, 목표형은 "무엇을 어떻게 치우느냐"라
 * 판 배치 자체가 문제가 된다. 그래서 목표 종류를 데이터로 두고 엔진은 세기만 한다.
 */
export type Goal =
  /** 특정 색 보석 N개 없애기 */
  | { kind: 'color'; color: GemColor; count: number }
  /** 특정 장애물 N개 완전히 제거 */
  | { kind: 'blocker'; blockerKind: string; count: number }
  /** 특정 덮개 N겹 벗기기 */
  | { kind: 'cover'; coverKind: string; count: number }
  /** 특정 바닥 N겹 벗기기 (잔디) */
  | { kind: 'ground'; groundKind: string; count: number }
  /** 특정 바닥으로 N칸 덮기 (젤리) - 없애는 게 아니라 넓히는 목표다 */
  | { kind: 'spread'; groundKind: string; count: number }
  /** 그릇에 N개 담기 (선반·찬장) */
  | { kind: 'collect'; collectKind: string; count: number };

export function goalTotal(goal: Goal): number {
  return goal.count;
}

/**
 * 한 턴에서 각 목표가 얼마나 진행됐는지 센다.
 *
 * 색은 clear 단계의 보드에서 읽는다. 그 보드에는 터질 보석이 아직 남아 있어서
 * (그래야 화면이 터지는 연출을 그릴 수 있다) 무슨 색이 없어졌는지 알 수 있다.
 * 낙하 뒤의 보드를 보면 이미 사라져서 셀 수가 없다.
 */
export function countProgress(goals: Goal[], result: TurnResult): number[] {
  const gained = goals.map(() => 0);

  result.steps.forEach(step => {
    if (step.kind === 'collect') {
      goals.forEach((goal, i) => {
        if (goal.kind !== 'collect') return;
        step.collects.forEach(e => {
          if (e.kind === goal.collectKind) gained[i] += 1;
        });
      });
      return;
    }
    // 판 아래로 빠져나간 장애물도 "제거"로 친다 - 부순 게 아니라 빼낸 것이지만
    // 플레이어가 목표를 달성한 건 마찬가지다.
    if (step.kind === 'fall') {
      goals.forEach((goal, i) => {
        if (goal.kind === 'blocker') {
          step.exits.forEach(e => {
            if (e.kind === goal.blockerKind) gained[i] += 1;
          });
          return;
        }

      });
      return;
    }
    if (step.kind !== 'clear') return;

    goals.forEach((goal, i) => {
      if (goal.kind === 'color') {
        step.cells.forEach(k => {
          const { row, col } = parseKey(k);
          const gem = at(step.board, row, col).gem;
          if (gem && gem.color === goal.color) gained[i] += 1;
        });
        return;
      }
      if (goal.kind === 'blocker') {
        step.damage.forEach(e => {
          if (e.target === 'blocker' && e.destroyed && e.kind === goal.blockerKind) gained[i] += 1;
        });
        return;
      }
      if (goal.kind === 'cover') {
        step.damage.forEach(e => {
          if (e.target === 'cover' && e.kind === goal.coverKind) gained[i] += 1;
        });
        return;
      }
      if (goal.kind === 'ground') {
        step.damage.forEach(e => {
          if (e.target === 'ground' && e.kind === goal.groundKind) gained[i] += 1;
        });
        return;
      }
      if (goal.kind === 'spread') {
        step.damage.forEach(e => {
          if (e.target === 'spread' && e.kind === goal.groundKind) gained[i] += 1;
        });
      }
    });
  });

  return gained;
}

/** 보드에 남아 있는 목표 대상 수 - 레벨을 만들 때 목표치가 달성 가능한지 검사한다. */
export function countOnBoard(board: Board, goal: Goal): number {
  let n = 0;
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = at(board, r, c);
      if (goal.kind === 'blocker' && cell.blocker?.kind === goal.blockerKind) n += 1;
      if (goal.kind === 'cover' && cell.cover?.kind === goal.coverKind) n += cell.cover.layers;
      if (goal.kind === 'ground' && cell.ground?.kind === goal.groundKind) n += cell.ground.layers;
      if (goal.kind === 'collect' && cell.collector?.kind === goal.collectKind) {
        n += cell.collector.need - cell.collector.got;
      }
      // 덮는 목표는 "아직 안 덮인 칸"이 남은 양이다 - 다른 목표와 부호가 반대다.
      if (goal.kind === 'spread' && cell.exists && cell.ground?.kind !== goal.groundKind) {
        n += 1;
      }
    }
  }
  return n;
}

export function describeGoal(goal: Goal): string {
  switch (goal.kind) {
    case 'color':
      return `${['빨강', '초록', '파랑', '노랑', '보라', '주황'][goal.color]} ${goal.count}개`;
    case 'blocker':
      return `${goal.blockerKind} ${goal.count}개`;
    case 'cover':
      return `${goal.coverKind} ${goal.count}겹`;
    case 'ground':
      return `${goal.groundKind} ${goal.count}겹`;
    case 'spread':
      return `${goal.groundKind}로 ${goal.count}칸 덮기`;
    case 'collect':
      return `${goal.collectKind} ${goal.count}개`;
  }
}

/**
 * 레벨 목표에서 프로펠러용 점수 함수를 만든다.
 * "목표물이 가장 많은 칸으로 날아간다"(SPEC 4.4)의 "목표물"이 무엇인지는
 * 레벨마다 다르므로, 목표를 아는 쪽에서 만들어 엔진에 넣어준다.
 */
/** 옆 칸에 이 바닥이 깔려 있는가 - 번짐이 닿을 수 있는 자리인지 본다 */
function touchesGround(board: Board, row: number, col: number, kind: string): boolean {
  return [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ].some(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= board.height || c >= board.width) return false;
    return at(board, r, c).ground?.kind === kind;
  });
}

export function goalTargetScorer(goals: Goal[]): TargetScorer {
  return (board, row, col) => {
    let score = 0;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r < 0 || c < 0 || r >= board.height || c >= board.width) continue;
        const cell = at(board, r, c);
        goals.forEach(goal => {
          if (goal.kind === 'blocker' && cell.blocker?.kind === goal.blockerKind) score += 3;
          if (goal.kind === 'cover' && cell.cover?.kind === goal.coverKind) score += 2;
          if (goal.kind === 'ground' && cell.ground?.kind === goal.groundKind) score += 2;
          // 덮는 목표는 **번질 수 있는 자리**가 값어치 있다 - 아직 안 덮였고
          // 옆에 이미 덮인 칸이 있는, 경계선 칸이다. "안 덮인 칸"을 전부 세면
          // 판의 거의 모든 칸이 같은 점수라 조준에 아무 정보가 없다.
          if (
            goal.kind === 'spread' &&
            cell.exists &&
            cell.ground?.kind !== goal.groundKind &&
            touchesGround(board, r, c, goal.groundKind)
          ) {
            score += 3;
          }
          if (goal.kind === 'color' && cell.gem?.color === goal.color) score += 1;
        });
      }
    }
    return score;
  };
}

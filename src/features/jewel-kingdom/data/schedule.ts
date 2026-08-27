import type { Recipe, ShapeKind } from '../engine/generate';

/**
 * 레벨 진행표 — 몇 번째 판에서 무엇이 나오는가.
 *
 * 생성기는 "이 재료로 만들어라"만 안다. **무엇을 언제 처음 보여줄지**는 난이도가
 * 아니라 가르치는 순서의 문제라 기계가 정할 수 없다. 그래서 여기에 사람이 적는다.
 *
 * 규칙 하나: **한 판에 새 요소는 하나만.** 두 개가 같이 처음 나오면 뭐가
 * 뭘 하는 건지 구분이 안 된다. 레퍼런스도 새 장애물은 혼자 등장시킨다.
 */

/** 이 요소가 처음 나오는 레벨 */
interface Introduction {
  at: number;
  id: string;
  /** 처음 나올 때 몇 개 */
  count: number;
  /**
   * 아무리 뒤로 가도 이보다 많이는 안 깔린다.
   *
   * 그릇은 판 너비만큼밖에 못 놓는 데다 하나마다 수집물을 판 끝까지
   * 흘려보내야 해서, 수를 늘리면 금세 아무리 해도 못 깨는 판이 된다
   * (실제로 21·50레벨이 그렇게 막혔다). 골렘도 여럿이 동시에 내려오면
   * 판이 곧바로 잔해로 덮인다.
   */
  max?: number;
  layers?: number;
}

/**
 * 확인된 요소만 쓴다.
 *
 * 미확인 요소로 레벨을 만들면 **추측 위에 난이도를 쌓는 것**이 된다.
 * 나중에 그 요소의 동작이 바뀌면 그걸 쓴 레벨의 난이도가 통째로 어긋난다.
 * 확인되는 대로 여기 한 줄씩 늘리면 된다.
 *
 * 아이템으로만 부서지는 것들(강철·금고·사슬·금속탑·젤리폭탄)도 뺐다.
 * 봇이 부스터를 안 써서 승률이 실제 난이도를 나타내지 못한다 - 재는 자가
 * 못 푸는 문제로는 난이도를 잴 수 없다.
 */
const INTRODUCTIONS: Introduction[] = [
  { at: 2, id: 'box', count: 4 },
  { at: 4, id: 'grass', count: 10 },
  { at: 6, id: 'crate', count: 3, layers: 2 },
  { at: 8, id: 'honey', count: 6 },
  { at: 10, id: 'ice', count: 4, layers: 2 },
  { at: 13, id: 'shelf', count: 3, max: 4, layers: 2 },
  { at: 16, id: 'golem', count: 1, max: 2, layers: 4 },
  { at: 19, id: 'mushroom', count: 5 },
  { at: 22, id: 'barrel', count: 2, layers: 3 },
  { at: 25, id: 'jelly', count: 1 },
  { at: 28, id: 'mailbox', count: 2, max: 4 },
  { at: 31, id: 'honey-pot', count: 2 },
  { at: 34, id: 'ghost', count: 3 },
  { at: 37, id: 'flowerpot', count: 2, layers: 2 },
  { at: 40, id: 'bottle', count: 4, layers: 2 },
];

/** 판 모양은 다섯 판마다 돌린다 - 같은 사각형만 계속 나오면 금세 물린다 */
const SHAPES: ShapeKind[] = ['full', 'full', 'diamond', 'full', 'cross'];

/**
 * 목표 승률 곡선.
 *
 * 처음엔 거의 다 이기고, 갈수록 여러 번 도전해야 깨지게 만든다.
 * **다섯 판마다 한 번은 쉬어간다** - 계속 어렵기만 하면 그만두게 된다.
 * 레퍼런스가 어려운 판 사이에 숨 돌릴 판을 끼워 넣는 것과 같은 이유다.
 */
export function targetWinRate(levelNo: number): number {
  if (levelNo <= 3) return 0.85;
  if (levelNo % 5 === 0) return 0.7; // 쉬어가는 판
  const decayed = 0.75 - (levelNo - 3) * 0.012;
  return Math.max(0.3, decayed);
}

/** 색 수 - 적을수록 쉽다. 난이도를 가장 크게 좌우한다. */
function colorsFor(levelNo: number): number {
  if (levelNo <= 4) return 4;
  if (levelNo <= 20) return 5;
  return 6;
}

/**
 * 그 레벨에 쓸 재료.
 *
 * 새로 나온 요소는 그대로 쓰고, 전에 나온 것 중 하나를 곁들인다.
 * 전부 다 넣으면 판이 장애물로 뒤덮여서 무엇을 하는 판인지 없어진다.
 */
/**
 * 뒤로 갈수록 같은 요소라도 더 많이 깔린다.
 *
 * 이게 없으면 후반 레벨이 **네 수짜리로 쪼그라든다.** 목표 승률만 낮추면
 * 생성기는 "이동 수를 줄여서" 그 승률을 맞추기 때문이다 - 할 일이 적은 판을
 * 수만 조여 어렵게 만든 꼴이라 판이 짧고 운에 좌우된다.
 * 어려워지는 방향은 "수를 조이는 것"이 아니라 "할 일이 느는 것"이어야 한다.
 */
function scaled(intro: Introduction, levelNo: number): number {
  return Math.min(intro.count + Math.floor(levelNo / 9), intro.max ?? 14);
}

export function recipeFor(levelNo: number): Recipe {
  const intro = INTRODUCTIONS.find(i => i.at === levelNo);
  const known = INTRODUCTIONS.filter(i => i.at < levelNo);

  const elements: Recipe['elements'] = [];
  if (intro) {
    // 처음 나오는 판은 그것만 놓는다.
    elements.push({ id: intro.id, count: scaled(intro, levelNo), layers: intro.layers });
  } else if (levelNo % 5 === 0 && known.length > 0) {
    // 쉬어가는 판. 재료도 가볍게 간다.
    //
    // 승률만 높게 잡고 재료는 그대로 두면 생성기가 목표에 못 닿는다 - 실제로
    // 50레벨이 그릇 넉 대를 놓고 70%를 맞추려다 실패했다. 쉬운 판은
    // **적게 놓아서** 쉬워야지 이동 수만 퍼줘서 쉬워지지 않는다.
    const light = known[levelNo % Math.min(known.length, 5)];
    elements.push({
      id: light.id,
      count: Math.max(1, Math.round(scaled(light, levelNo) / 2)),
      layers: light.layers,
    });
  } else if (known.length > 0) {
    // 배운 것 중 둘을 섞는다. 고르는 방법이 레벨 번호라 판마다 다르면서도 재현된다.
    const a = known[levelNo % known.length];
    elements.push({ id: a.id, count: scaled(a, levelNo), layers: a.layers });
    if (known.length > 1 && levelNo % 3 === 0) {
      const b = known[(levelNo * 7 + 3) % known.length];
      if (b.id !== a.id) {
        elements.push({
          id: b.id,
          count: Math.max(1, Math.round(scaled(b, levelNo) / 2)),
          layers: b.layers,
        });
      }
    }
  }

  return {
    width: 7,
    height: 7,
    colors: colorsFor(levelNo),
    shape: SHAPES[levelNo % SHAPES.length],
    elements,
    colorGoal: 20 + levelNo,
  };
}

/** 진행표가 다루는 마지막 레벨 */
export const LAST_SCHEDULED = 60;

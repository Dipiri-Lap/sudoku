import type { Recipe, ShapeKind } from '../engine/generate';
import type { LevelTier } from '../engine/level';
import { makeRng } from '../engine/rng';

/**
 * 레벨 진행표 — 몇 번째 판에서 무엇이 나오고, 얼마나 어려운가. (1~1000판)
 *
 * 생성기는 "이 재료로, 이 승률에 맞춰 만들어라"만 안다. **무엇을 언제 처음 보여줄지**와
 * **어디서 조이고 어디서 풀어줄지**는 기계가 정할 수 없어서 여기에 사람이 적는다.
 *
 * 규칙 하나: **한 판에 새 요소는 하나만.** 두 개가 같이 처음 나오면 뭐가
 * 뭘 하는 건지 구분이 안 된다. 레퍼런스도 새 장애물은 혼자 등장시킨다.
 *
 * 난이도는 세 겹의 물결이다.
 *  1. 큰 흐름: 1~300판까지 서서히 어려워지고 그 뒤로는 평평하다(끝없이 어려워지면 그만둔다)
 *  2. 장(50판): 장이 시작할 땐 살짝 풀어 주고 끝으로 갈수록 조인다
 *  3. 10판 주기: 5번째는 "어려운 판", 10번째는 "아주 어려운 판", 그 바로 다음은 쉬어가는 판
 *     - 레퍼런스처럼 어려운 판 사이에 숨 돌릴 판을 끼워 넣어야 계속 한다
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
 * 확인된 요소 중 **봇이 풀 수 있고 텃밭 그림이 있는 것**만 쓴다.
 *
 * 미확인 요소로 레벨을 만들면 추측 위에 난이도를 쌓는 것이 된다.
 * 아이템으로만 부서지는 것들(강철·금고·사슬·금속탑·젤리폭탄)은 뺐다 - 봇이 부스터를
 * 안 써서 승률이 실제 난이도를 나타내지 못한다. 찬장·방패 구조물은 봇이 못 풀어서
 * (생성 실패) 뺐고, 묘비·물감통·씨앗상자는 아직 텃밭 그림이 없어 뺐다.
 * 통나무·빨강자물쇠·장독·가마솥·밀짚모자·거미줄·디딤돌·검은꿀은 봇이 풀고 그림도
 * 있지만 아직 동작 확인(verified) 전이라 뺐다 - 확인되는 대로 여기 한 줄씩 늘리면 된다.
 *
 * 새 요소는 쉬운 자리(주기의 1·2·3·6·7번째)에만 등장시킨다. 처음 보는 장애물을
 * 어려운 판에서 만나면 규칙을 배우기도 전에 진다.
 */
const INTRODUCTIONS: Introduction[] = [
  { at: 2, id: 'box', count: 4 },
  { at: 4, id: 'grass', count: 10 },
  { at: 6, id: 'crate', count: 3, layers: 2 },
  { at: 8, id: 'honey', count: 6 },
  { at: 11, id: 'ice', count: 4, layers: 2 },
  { at: 13, id: 'shelf', count: 3, max: 4, layers: 2 },
  // 골렘 둘은 6색 판에서 아무리 수를 줘도 못 깬다(157·164·417레벨 등 생성 실패)
  { at: 16, id: 'golem', count: 1, max: 1, layers: 4 },
  { at: 19, id: 'mushroom', count: 5 },
  { at: 22, id: 'barrel', count: 2, layers: 3 },
  { at: 26, id: 'jelly', count: 1, max: 3 },
  { at: 28, id: 'mailbox', count: 2, max: 4 },
  { at: 31, id: 'honey-pot', count: 2 },
  { at: 34, id: 'ghost', count: 3 },
  { at: 37, id: 'flowerpot', count: 2, layers: 2 },
  { at: 41, id: 'bottle', count: 4, layers: 2 },
  { at: 47, id: 'soil', count: 6 },
  { at: 62, id: 'cloud', count: 4 },
  { at: 71, id: 'rubble', count: 5 },
];

/** 진행표가 다루는 마지막 레벨 */
export const LAST_SCHEDULED = 1000;

/** 판의 성격. 화면에 "어려운 판" 표시를 할 때도 쓴다 */
export type Tier = LevelTier;

/**
 * 10판 주기. 승률 보정값(+는 쉬움)과 재료 양 배수.
 * 인덱스 = (레벨 - 1) % 10 → 1번째 판이 0이다.
 */
const CYCLE: { tier: Tier; offset: number; amount: number }[] = [
  { tier: 'relief', offset: 0.14, amount: 0.6 }, // 아주 어려운 판 바로 다음: 확 풀어 준다
  { tier: 'normal', offset: 0.06, amount: 0.9 },
  { tier: 'normal', offset: 0.02, amount: 1 },
  { tier: 'normal', offset: -0.02, amount: 1 },
  { tier: 'hard', offset: -0.1, amount: 1.25 }, // 어려운 판
  { tier: 'relief', offset: 0.1, amount: 0.7 },
  { tier: 'normal', offset: 0.02, amount: 1 },
  { tier: 'normal', offset: -0.03, amount: 1.05 },
  { tier: 'normal', offset: -0.06, amount: 1.1 },
  { tier: 'super', offset: -0.18, amount: 1.45 }, // 아주 어려운 판(주기의 끝)
];

/** 어려운 판이 처음 나오는 레벨. 그 전엔 물결 없이 완만하게 배운다 */
const WAVE_FROM = 15;

function introAt(levelNo: number): Introduction | undefined {
  return INTRODUCTIONS.find(i => i.at === levelNo);
}

/** 이 레벨의 성격 */
export function tierFor(levelNo: number): Tier {
  if (introAt(levelNo)) return 'intro';
  if (levelNo < WAVE_FROM) return 'normal';
  return CYCLE[(levelNo - 1) % 10].tier;
}

/** 큰 흐름: 1~300판에 걸쳐 내려가고 그 뒤로 평평하다 */
function baseRate(levelNo: number): number {
  if (levelNo <= 10) return 0.86 - (levelNo - 1) * 0.01;
  if (levelNo <= 100) return 0.76 - ((levelNo - 10) / 90) * 0.2;
  if (levelNo <= 300) return 0.56 - ((levelNo - 100) / 200) * 0.12;
  return 0.44;
}

/** 장(50판) 물결: 장 처음엔 +0.04, 끝엔 -0.03 */
function chapterWave(levelNo: number): number {
  if (levelNo <= 20) return 0;
  const pos = ((levelNo - 1) % 50) / 49;
  return 0.04 - 0.07 * pos;
}

/**
 * 목표 승률(봇 기준). 봇은 사람보다 서툴러서 절대값은 사람 승률과 다르다 -
 * 판끼리의 상대적인 어려움을 맞추는 눈금으로 쓴다.
 */
export function targetWinRate(levelNo: number): number {
  const base = baseRate(levelNo) + chapterWave(levelNo);
  // 처음 보는 요소가 나오는 판은 주기와 상관없이 쉽게
  if (introAt(levelNo)) return clamp(base + 0.1);
  if (levelNo < WAVE_FROM) return clamp(base);
  // 물결은 서서히 커진다 - 15판에서 갑자기 "아주 어려운 판"이 튀어나오지 않게
  const amp = Math.min(1, (levelNo - WAVE_FROM + 5) / 40);
  return clamp(base + CYCLE[(levelNo - 1) % 10].offset * amp);
}

function clamp(rate: number): number {
  return Math.round(Math.min(0.9, Math.max(0.25, rate)) * 100) / 100;
}

/** 색 수 - 적을수록 쉽다. 난이도를 가장 크게 좌우한다. */
function colorsFor(levelNo: number, tier: Tier): number {
  if (levelNo <= 4) return 4;
  if (levelNo <= 30) return 5;
  // 150판까지는 쉬어가는 판에서 한 색을 빼 준다
  if (tier === 'relief' && levelNo <= 150) return 5;
  return 6;
}

/**
 * 뒤로 갈수록 같은 요소라도 더 많이 깔린다.
 *
 * 이게 없으면 후반 레벨이 **네 수짜리로 쪼그라든다.** 목표 승률만 낮추면
 * 생성기는 "이동 수를 줄여서" 그 승률을 맞추기 때문이다 - 할 일이 적은 판을
 * 수만 조여 어렵게 만든 꼴이라 판이 짧고 운에 좌우된다.
 * 어려워지는 방향은 "수를 조이는 것"이 아니라 "할 일이 느는 것"이어야 한다.
 * 어려운 판일수록 재료를 더 깐다(CYCLE.amount)도 같은 이유다.
 */
function scaled(intro: Introduction, levelNo: number, amount = 1): number {
  const grown = intro.count + Math.floor(levelNo / 12);
  return Math.max(1, Math.min(Math.round(grown * amount), intro.max ?? 12));
}

/** 판 모양. 넓은 사각형이 기본이고 가끔 모양 있는 판을 섞는다 */
const SHAPES: { shape: ShapeKind; weight: number }[] = [
  { shape: 'full', weight: 5 },
  { shape: 'diamond', weight: 2 },
  { shape: 'cross', weight: 1.5 },
  { shape: 'hourglass', weight: 1.5 },
];

function pickShape(rand: () => number): ShapeKind {
  const total = SHAPES.reduce((s, x) => s + x.weight, 0);
  let r = rand() * total;
  for (const s of SHAPES) {
    r -= s.weight;
    if (r < 0) return s.shape;
  }
  return 'full';
}

/**
 * 그 레벨에 쓸 재료.
 *
 * 고르는 방법이 레벨 번호에서 나온 난수라 판마다 다르면서도 다시 구워도 같다.
 * 막 배운 요소(30판 안)는 더 자주 나와서 손에 익게 한다.
 */
export function recipeFor(levelNo: number): Recipe {
  const rng = makeRng(levelNo * 2654435761 + 97);
  const rand = () => rng.next();
  const tier = tierFor(levelNo);
  const intro = introAt(levelNo);
  const known = INTRODUCTIONS.filter(i => i.at < levelNo);
  const cycle = levelNo < WAVE_FROM ? CYCLE[2] : CYCLE[(levelNo - 1) % 10];

  const elements: Recipe['elements'] = [];
  const add = (it: Introduction, amount: number) => {
    if (elements.some(e => e.id === it.id)) return;
    elements.push({ id: it.id, count: scaled(it, levelNo, amount), layers: it.layers });
  };

  if (intro) {
    // 처음 나오는 판은 그것만 놓는다.
    elements.push({ id: intro.id, count: scaled(intro, levelNo), layers: intro.layers });
  } else if (known.length > 0) {
    const recent = known.filter(i => levelNo - i.at <= 30);
    const pick = () => known[rng.int(known.length)];
    const main = recent.length > 0 && rand() < 0.5 ? recent[rng.int(recent.length)] : pick();
    add(main, cycle.amount);

    // 곁들이는 요소: 쉬어가는 판은 없음, 어려운 판은 하나, 아주 어려운 판은 둘까지
    const extras =
      tier === 'relief' ? 0 : tier === 'super' ? (levelNo > 60 ? 2 : 1) : tier === 'hard' ? 1 : rand() < 0.35 ? 1 : 0;
    for (let i = 0; i < extras && known.length > 1; i++) add(pick(), cycle.amount * 0.5);
  }

  return {
    width: 7,
    height: 7,
    colors: colorsFor(levelNo, tier),
    // 그릇은 맨 아랫줄에 놓는데, 모양 있는 판은 아랫줄이 좁아 다 안 들어간다(27·40·216레벨 실패)
    shape: intro || levelNo <= 5 || elements.some(e => e.id === 'shelf') ? 'full' : pickShape(rand),
    elements,
    // 색 목표(골렘 판 등). 6색에 60개를 걸면 못 깬다 - 40개에서 멈춘다
    colorGoal: 20 + Math.min(levelNo, 20),
  };
}

/**
 * 할 일이 너무 적어서 수를 아무리 조여도 목표보다 쉬운 판에 쓰는 무거운 재료.
 * 수를 조이는 대신 할 일을 늘린다(scaled 주석과 같은 이유). 상한(max)은 지킨다.
 */
export function heavierRecipe(recipe: Recipe, step: number, levelNo: number): Recipe {
  const known = INTRODUCTIONS.filter(i => i.at < levelNo);
  const cap = (id: string) => INTRODUCTIONS.find(i => i.id === id)?.max ?? 14;
  const elements = recipe.elements.map(e => ({ ...e, count: Math.min(cap(e.id), Math.round(e.count * (1 + 0.4 * step))) }));
  // 곁들일 요소를 하나 더 얹는다(단계마다 다른 것)
  const rng = makeRng(levelNo * 31 + step);
  const extra = known.filter(i => !elements.some(e => e.id === i.id));
  if (extra.length > 0) {
    const it = extra[rng.int(extra.length)];
    elements.push({ id: it.id, count: Math.max(1, Math.round(scaled(it, levelNo) * 0.6)), layers: it.layers });
  }
  return { ...recipe, elements };
}

/**
 * 생성기가 목표에 못 닿을 때 한 단계씩 풀어 주는 재료.
 *
 * 어떤 조합은 이동 수를 아무리 줘도 목표 승률이 안 나온다(골렘 둘 + 그릇 넷 등).
 * 그럴 때 판을 통째로 비우지 않고 곁들인 요소부터 덜어 낸다.
 */
export function lighterRecipe(recipe: Recipe, step: number): Recipe {
  const elements = recipe.elements
    .slice(0, Math.max(1, recipe.elements.length - step))
    .map(e => ({ ...e, count: Math.max(1, Math.round(e.count * Math.pow(0.75, step))) }));
  return { ...recipe, elements };
}

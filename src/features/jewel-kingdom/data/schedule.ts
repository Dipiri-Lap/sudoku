import type { Recipe, RecipeElement } from '../engine/generate';
import type { LevelTier } from '../engine/level';
import { makeRng, type Rng } from '../engine/rng';
import { maskKey, sculptMask, type Mask, type Pattern, type Zone } from '../engine/layouts';

/**
 * 레벨 진행표 — 몇 번째 판에서 무엇이 나오고, 판이 어떻게 생기고, 얼마나 어려운가. (1~1000판)
 *
 * 생성기는 "이 재료로, 이 승률에 맞춰 만들어라"만 안다. **무엇을 언제 처음 보여줄지**와
 * **어디서 조이고 어디서 풀어줄지**는 기계가 정할 수 없어서 여기에 사람이 적는다.
 *
 * 로얄매치·캔디크러시를 벤치마킹한 규칙:
 *  - 판 모양은 거의 매 판 다르다 → 매 판 새로 조각하고, 최근 판과 겹치면 다시 조각한다
 *  - 판당 장애물 종류: 초반 1~2종 → 50판부터 2~3종 → 100판부터 3~4종
 *  - 목표물은 다른 장애물이 감싸거나 막고 있다 → 길만 막는 장애물(목표 아님)을 따로 둔다
 *  - 새 장애물은 약 6~13판마다 하나, 나온 뒤 5판은 집중해서 쓰고 2~3판은 옛 장애물로 쉬어 간다
 *  - 소개가 끝난 뒤에도 같은 장애물의 단단한 변형(겹 수↑)이 새로 등장하듯 나온다
 *  - 어려운 판은 x5·x9번째, 59판부터 x9번째는 아주 어려운 판, 그다음 판은 쉬어 가는 판
 *  - 50판(한 장)마다 주인공 장애물을 정해 그 장의 분위기를 만든다
 *
 * 규칙 하나: **한 판에 새 요소는 하나만.** 두 개가 같이 처음 나오면 뭐가
 * 뭘 하는 건지 구분이 안 된다.
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
   * 흘려보내야 해서, 수를 늘리면 금세 아무리 해도 못 깨는 판이 된다.
   * 골렘 둘은 6색 판에서 아무리 수를 줘도 못 깬다.
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
 * 새 요소는 쉬운 자리에만 등장시킨다(x5·x9번째는 피한다). 처음 보는 장애물을
 * 어려운 판에서 만나면 규칙을 배우기도 전에 진다.
 */
const INTRODUCTIONS: Introduction[] = [
  { at: 2, id: 'box', count: 4 },
  { at: 4, id: 'grass', count: 10 },
  { at: 7, id: 'crate', count: 3, layers: 2 },
  { at: 10, id: 'honey', count: 6 },
  { at: 13, id: 'ice', count: 3 }, // 돌: 아이템으로만 깨지므로 처음엔 한 겹
  { at: 17, id: 'shelf', count: 3, max: 4, layers: 2 },
  { at: 21, id: 'golem', count: 1, max: 1, layers: 4 },
  { at: 27, id: 'mushroom', count: 5 },
  { at: 32, id: 'barrel', count: 2, layers: 3 },
  { at: 38, id: 'jelly', count: 1, max: 3 },
  { at: 43, id: 'mailbox', count: 2, max: 4 },
  { at: 50, id: 'honey-pot', count: 2 },
  { at: 57, id: 'ghost', count: 3 },
  { at: 64, id: 'flowerpot', count: 2, layers: 2 },
  { at: 72, id: 'bottle', count: 4, layers: 2 },
  { at: 81, id: 'soil', count: 6 },
  { at: 92, id: 'cloud', count: 4 },
  { at: 103, id: 'rubble', count: 5 },
];

/**
 * 강화 등장: 이미 아는 장애물이 더 단단해져서 다시 나온다(로얄매치의 "큰 철문"처럼).
 * 새 요소가 바닥난 뒤에도 "처음 보는 것"이 이어지게 한다. 그 뒤로는 반쯤 이 겹 수로 나온다.
 */
const VARIANTS: { at: number; id: string; layers: number }[] = [
  { at: 114, id: 'crate', layers: 3 },
  { at: 127, id: 'ice', layers: 2 },
  { at: 141, id: 'bottle', layers: 3 },
  { at: 153, id: 'flowerpot', layers: 3 },
  { at: 167, id: 'barrel', layers: 4 },
];

/** 길만 막는 장애물(목표 아님)로 쓸 수 있는 것: 흔한 상자·덮개류. 그릇·골렘 같은 장치는 뺀다 */
// 돌(ice)은 아이템으로만 깨져서 길막이로 깔면 사실상 벽이 된다 - 목표로만 쓴다
const OBSTACLE_IDS = new Set(['box', 'crate', 'barrel', 'honey', 'bottle', 'flowerpot', 'rubble', 'cloud']);

/** 바닥(밑에 깔리는 것). 배치 무늬를 고를 때 쓴다 */
const GROUND_IDS = new Set(['grass', 'soil', 'jelly']);
/** 덮개(보석 위에 얹히는 것) */
const COVER_IDS = new Set(['honey', 'cloud']);

/** 진행표가 다루는 마지막 레벨 */
export const LAST_SCHEDULED = 1000;

/** 판의 성격. 화면에 "어려운 판" 표시를 할 때도 쓴다 */
export type Tier = LevelTier;

function introAt(levelNo: number): Introduction | undefined {
  return INTRODUCTIONS.find(i => i.at === levelNo);
}

function variantAt(levelNo: number) {
  return VARIANTS.find(v => v.at === levelNo);
}

/**
 * 이 레벨의 성격.
 * 로얄매치 박자: 39판부터 x9·x5번째가 어려운 판(45판부터 x5), 59판부터 x9번째는
 * 아주 어려운 판. 그 바로 다음 판(x0·x6)은 쉬어 가는 판.
 */
export function tierFor(levelNo: number): Tier {
  if (introAt(levelNo) || variantAt(levelNo)) return 'intro';
  const d = levelNo % 10;
  if (d === 9 && levelNo >= 59) return 'super';
  if (d === 9 && levelNo >= 39) return 'hard';
  if (d === 5 && levelNo >= 45) return 'hard';
  if ((d === 0 || d === 6) && levelNo >= 40) return 'relief';
  return 'normal';
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

/** 판 성격별 승률 보정(+는 쉬움)과 재료 양 배수 */
const TIER_TUNING: Record<Tier, { offset: number; amount: number }> = {
  intro: { offset: 0.1, amount: 1 },
  relief: { offset: 0.11, amount: 0.7 },
  normal: { offset: 0, amount: 1 },
  hard: { offset: -0.11, amount: 1.25 },
  super: { offset: -0.18, amount: 1.4 },
};

/** 보통 판끼리도 조금씩 오르내리게(x1이 가장 쉽고 x8이 가장 빡빡) */
const NORMAL_WIGGLE = [0, 0.05, 0.02, -0.01, -0.03, 0, 0, 0.02, -0.04, 0];

/**
 * 목표 승률(봇 기준). 봇은 사람보다 서툴러서 절대값은 사람 승률과 다르다 -
 * 판끼리의 상대적인 어려움을 맞추는 눈금으로 쓴다.
 */
export function targetWinRate(levelNo: number): number {
  const base = baseRate(levelNo) + chapterWave(levelNo);
  const tier = tierFor(levelNo);
  if (tier === 'intro') return clamp(base + TIER_TUNING.intro.offset);
  // 물결은 서서히 커진다 - 30판 무렵부터 오르내림이 생긴다
  const amp = Math.min(1, Math.max(0, (levelNo - 20) / 30));
  const wiggle = tier === 'normal' ? NORMAL_WIGGLE[levelNo % 10] : 0;
  return clamp(base + (TIER_TUNING[tier].offset + wiggle) * amp);
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
 * 뒤로 갈수록 같은 요소라도 더 많이 깔린다. 넓은 판일수록 더 많이.
 *
 * 이게 없으면 후반 레벨이 **네 수짜리로 쪼그라든다.** 목표 승률만 낮추면
 * 생성기는 "이동 수를 줄여서" 그 승률을 맞추기 때문이다 - 할 일이 적은 판을
 * 수만 조여 어렵게 만든 꼴이라 판이 짧고 운에 좌우된다.
 * 어려워지는 방향은 "수를 조이는 것"이 아니라 "할 일이 느는 것"이어야 한다.
 */
function scaled(intro: Introduction, levelNo: number, amount = 1, area = 49): number {
  const grown = (intro.count + Math.floor(levelNo / 12)) * (area / 49);
  return Math.max(1, Math.min(Math.round(grown * amount), intro.max ?? 14));
}

// ── 판 모양 ──────────────────────────────────────────────────────────

function sizeFor(levelNo: number, rng: Rng): number {
  if (levelNo <= 20) return 7;
  const r = rng.next();
  if (levelNo < 60) return r < 0.6 ? 7 : 8;
  if (levelNo < 150) return r < 0.35 ? 7 : r < 0.75 ? 8 : 9;
  return r < 0.25 ? 7 : r < 0.6 ? 8 : 9;
}

function cutsFor(levelNo: number, rng: Rng): number {
  if (levelNo <= 3) return 0;
  if (levelNo <= 10) return 1;
  if (levelNo < 40) return 1 + rng.int(2);
  // 아주 가끔은 깎지 않은 넓은 판(그것도 크기·배치가 달라 같은 판이 아니다)
  if (rng.next() < 0.05) return 0;
  return 1 + rng.int(3);
}

/** 최근 이만큼의 판과는 모양이 겹치지 않게 한다 */
const MASK_MEMORY = 60;
const maskCache: Mask[] = [];

/** 레벨의 판 모양. 앞 판들의 모양과 겹치지 않게 다시 조각한다(같은 번호면 늘 같은 모양) */
export function maskFor(levelNo: number): Mask {
  for (let n = maskCache.length + 1; n <= levelNo; n++) {
    const rng = makeRng(n * 40503 + 7);
    const recent = new Set(maskCache.slice(-MASK_MEMORY).map(maskKey));
    let mask: Mask | null = null;
    for (let tryNo = 0; tryNo < 30; tryNo++) {
      const size = sizeFor(n, rng);
      const cuts = Math.max(cutsFor(n, rng), tryNo > 10 ? 1 : 0);
      const m = sculptMask(size, cuts, rng);
      mask = m;
      // 처음 몇 판(깎지 않는 판)은 겹쳐도 된다
      if (!recent.has(maskKey(m)) || n <= 3) break;
    }
    maskCache.push(mask!);
  }
  return maskCache[levelNo - 1];
}

// ── 재료 ────────────────────────────────────────────────────────────

/** 장(50판)의 주인공 장애물 둘. 장이 시작할 때 아는 것 중에서 고른다 */
function chapterTheme(levelNo: number): Introduction[] {
  const chapter = Math.floor((levelNo - 1) / 50);
  const known = INTRODUCTIONS.filter(i => i.at <= chapter * 50 + 1);
  if (known.length === 0) return [];
  const rng = makeRng(chapter * 7177 + 3);
  const a = known[rng.int(known.length)];
  const rest = known.filter(i => i.id !== a.id);
  return rest.length > 0 ? [a, rest[rng.int(rest.length)]] : [a];
}

/** 판당 장애물 종류 수 */
function kindsFor(levelNo: number, tier: Tier, rng: Rng): number {
  if (tier === 'intro') return 1;
  if (levelNo < 10) return 1;
  let k: number;
  if (levelNo < 25) k = 1 + (rng.next() < 0.5 ? 1 : 0);
  else if (levelNo < 50) k = 2;
  else if (levelNo < 100) k = 2 + (rng.next() < 0.5 ? 1 : 0);
  else k = 3 + (rng.next() < 0.3 ? 1 : 0);
  if (tier === 'relief') k = Math.max(1, k - 1);
  if (tier === 'hard' || tier === 'super') k = Math.min(4, k + 1);
  return k;
}

function weighted<T>(items: [T, number][], rng: Rng): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [it, w] of items) {
    r -= w;
    if (r < 0) return it;
  }
  return items[0][0];
}

/** 목표물 배치 무늬: 바닥은 밭처럼, 덮개는 지붕처럼, 장애물은 덩어리·띠 등 */
function goalPattern(id: string, rng: Rng): Pattern {
  if (GROUND_IDS.has(id)) {
    return weighted<Pattern>([['bottom', 3], ['band', 2], ['checker', 2], ['frame', 2], ['cluster', 2], ['mirror', 1], ['diagonal', 1]], rng);
  }
  if (COVER_IDS.has(id)) {
    return weighted<Pattern>([['top', 3], ['band', 2], ['cluster', 2], ['frame', 2], ['diagonal', 1], ['checker', 1], ['mirror', 1]], rng);
  }
  return weighted<Pattern>(
    [['cluster', 3], ['band', 2], ['pillars', 2], ['frame', 2], ['diagonal', 1.5], ['checker', 1.5], ['mirror', 2], ['bottom', 1], ['top', 1]],
    rng,
  );
}

function goalZone(rng: Rng): Zone {
  return weighted<Zone>([['any', 3], ['bottom', 2], ['middle', 2], ['top', 1.5]], rng);
}

/** 길을 막는 장애물 무늬: 목표물을 감싸거나, 판을 가로질러 막는다 */
function obstaclePattern(rng: Rng): Pattern {
  return weighted<Pattern>([['guard', 4], ['band', 2], ['pillars', 1.5], ['frame', 1.5], ['diagonal', 1], ['mirror', 1]], rng);
}

/** 이 레벨에서 그 장애물의 겹 수. 강화 등장 뒤로는 반쯤 단단한 쪽으로 */
function layersFor(it: Introduction, levelNo: number, rng: Rng): number | undefined {
  const v = VARIANTS.find(x => x.id === it.id && x.at <= levelNo);
  if (v && (variantAt(levelNo)?.id === it.id || rng.next() < 0.5)) return v.layers;
  return it.layers;
}

/**
 * 그 레벨에 쓸 재료와 판.
 *
 * 고르는 방법이 레벨 번호에서 나온 난수라 판마다 다르면서도 다시 구워도 같다.
 */
export function recipeFor(levelNo: number): Recipe {
  const rng = makeRng(levelNo * 2654435761 + 97);
  const tier = tierFor(levelNo);
  const intro = introAt(levelNo);
  const variant = variantAt(levelNo);
  const known = INTRODUCTIONS.filter(i => i.at < levelNo);
  const tune = TIER_TUNING[tier];
  const mask = maskFor(levelNo);
  const size = mask.length;
  const area = mask.reduce((s, row) => s + row.filter(Boolean).length, 0);

  const elements: RecipeElement[] = [];
  const has = (id: string) => elements.some(e => e.id === id);
  const patterns = new Set<Pattern>();
  const distinct = (p: () => Pattern) => {
    let x = p();
    for (let i = 0; i < 4 && patterns.has(x) && x !== 'guard'; i++) x = p();
    patterns.add(x);
    return x;
  };

  if (intro) {
    // 처음 나오는 판은 그것만, 배우기 쉬운 무늬로
    elements.push({ id: intro.id, count: scaled(intro, levelNo, 1, area), layers: intro.layers, pattern: 'mirror' });
  } else if (known.length > 0) {
    // ── 주인공(첫 번째 목표) 고르기 ──
    const lastIntro = [...INTRODUCTIONS, ...VARIANTS.map(v => ({ ...INTRODUCTIONS.find(i => i.id === v.id)!, at: v.at }))]
      .filter(i => i.at < levelNo)
      .sort((a, b) => b.at - a.at)[0];
    const since = lastIntro ? levelNo - lastIntro.at : 99;
    const theme = chapterTheme(levelNo).filter(t => t.at < levelNo);
    let main: Introduction;
    if (variant) {
      main = INTRODUCTIONS.find(i => i.id === variant.id)!;
    } else if (lastIntro && since <= 5 && rng.next() < 0.8) {
      // 막 나온 것은 5판 동안 집중해서
      main = INTRODUCTIONS.find(i => i.id === lastIntro.id)!;
    } else if (lastIntro && since <= 8) {
      // 그다음 2~3판은 옛 장애물로 쉬어 간다
      const old = known.filter(i => i.at < lastIntro.at - 15);
      main = (old.length > 0 ? old : known)[rng.int((old.length > 0 ? old : known).length)];
    } else if (theme.length > 0 && rng.next() < 0.45) {
      main = theme[rng.int(theme.length)];
    } else {
      main = known[rng.int(known.length)];
    }
    elements.push({
      id: main.id,
      count: scaled(main, levelNo, tune.amount, area),
      layers: layersFor(main, levelNo, rng),
      pattern: distinct(() => goalPattern(main.id, rng)),
      zone: goalZone(rng),
    });

    // ── 곁들이는 것들 ──
    const kinds = kindsFor(levelNo, tier, rng);
    for (let i = 1; i < kinds; i++) {
      // 두 번째는 반쯤 두 번째 목표, 나머지는 길을 막는 장애물(목표 아님)
      const asGoal = i === 1 && rng.next() < 0.45;
      const pool = known.filter(it => !has(it.id) && (asGoal || OBSTACLE_IDS.has(it.id)));
      if (pool.length === 0) break;
      const it = pool[rng.int(pool.length)];
      elements.push({
        id: it.id,
        count: scaled(it, levelNo, tune.amount * (asGoal ? 0.6 : 0.55), area),
        layers: layersFor(it, levelNo, rng),
        pattern: distinct(() => (asGoal ? goalPattern(it.id, rng) : obstaclePattern(rng))),
        zone: asGoal ? goalZone(rng) : 'any',
        goal: asGoal,
      });
    }

    // 판이 장애물로 뒤덮이지 않게 전체를 판 칸의 40%로 묶는다
    const total = elements.reduce((s, e) => s + e.count, 0);
    const cap = Math.floor(area * 0.4);
    if (total > cap) elements.forEach(e => (e.count = Math.max(1, Math.floor((e.count * cap) / total))));
  }

  return {
    width: size,
    height: size,
    colors: colorsFor(levelNo, tier),
    shape: 'full',
    mask,
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
  // 길을 막는 장애물을 하나 더 얹는다(단계마다 다른 것)
  const rng = makeRng(levelNo * 31 + step);
  const extra = known.filter(i => !elements.some(e => e.id === i.id) && OBSTACLE_IDS.has(i.id));
  if (extra.length > 0) {
    const it = extra[rng.int(extra.length)];
    elements.push({
      id: it.id,
      count: Math.max(1, Math.round(scaled(it, levelNo) * 0.6)),
      layers: it.layers,
      pattern: obstaclePattern(rng),
      goal: false,
    });
  }
  return { ...recipe, elements };
}

/**
 * 생성기가 목표에 못 닿을 때 한 단계씩 풀어 주는 재료.
 *
 * 어떤 조합은 이동 수를 아무리 줘도 목표 승률이 안 나온다(골렘 + 그릇 넷 등).
 * 그럴 때 판을 통째로 비우지 않고 곁들인 요소부터 덜어 낸다.
 */
export function lighterRecipe(recipe: Recipe, step: number): Recipe {
  const elements = recipe.elements
    .slice(0, Math.max(1, recipe.elements.length - step))
    .map(e => ({ ...e, count: Math.max(1, Math.round(e.count * Math.pow(0.75, step))) }));
  return { ...recipe, elements };
}

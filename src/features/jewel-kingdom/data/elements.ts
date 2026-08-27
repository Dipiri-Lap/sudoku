import type { Cell, GemColor, Spread } from '../engine/types';

/**
 * 장애물 카탈로그.
 *
 * 레퍼런스에는 40종 가까이 있지만 대부분 **같은 동작의 리스킨**이다.
 * 그래서 종류마다 코드를 쓰지 않고, 여덟 개의 축(겹·아이템전용·색지정·숨김·
 * 바닥·이동·생성·보조 + 레이어/벽/방패/분열/그릇/투입구)을 조합해 여기 한 줄로 적는다.
 *
 * 새 요소를 넣는 방법 = 이 표에 한 줄 추가. 엔진도 표기법도 안 건드린다.
 *
 * ⚠️ 동작이 출처로 확인된 건 일부뿐이다. 나머지는 분류(생성/그릇/상단/하단/특수)에
 * 맞춘 합리적인 추정이고 `verified: false`로 표시해 뒀다. 레퍼런스를 플레이하며
 * 하나씩 확정하면 된다.
 */
export type ElementCategory =
  | 'generator' // 매 턴 무언가를 내놓는다
  | 'container' // 떨어져 들어온 것을 받아 담는다
  | 'upper' // 보석 위에 덮인다
  | 'lower' // 보석 아래 깔린다
  | 'blocker' // 칸을 차지하고 막는다
  | 'special'; // 그 밖의 특수 동작

export interface ElementDef {
  id: string;
  label: string;
  category: ElementCategory;
  /** 기본 겹 수 */
  layers?: number;
  /** 동작이 출처로 확인됐는가. false면 분류에 맞춘 추정이다. */
  verified: boolean;
  /** 한 줄 설명 - 화면 툴팁과 레벨 편집에 쓴다 */
  note: string;
  /** 이 요소를 칸에 적용한다 */
  apply(cell: Cell, layers: number, color: GemColor | null): void;
  /** 레벨이 함께 걸어줘야 하는 턴 종료 훅 */
  hook?: 'golem' | 'producer' | 'conveyor' | 'zap' | 'regrow';
}

const blocker =
  (kind: string, extra: Partial<NonNullable<Cell['blocker']>> = {}) =>
  (cell: Cell, layers: number) => {
    cell.gem = null;
    cell.blocker = { kind, layers, ...extra };
  };

const cover =
  (kind: string, extra: Partial<NonNullable<Cell['cover']>> = {}) =>
  (cell: Cell, layers: number) => {
    cell.cover = { kind, layers, ...extra };
  };

const ground =
  (kind: string) =>
  (cell: Cell, layers: number) => {
    cell.ground = { kind, layers };
  };

/** 3x3으로 번지는 것 - 레퍼런스의 꿀단지·화분이 아홉 칸을 채운다 */
const spread = (kind: string, layer: Spread['layer']): Spread => ({ kind, layer, radius: 1 });

const container =
  (kind: string) =>
  (cell: Cell, layers: number, color: GemColor | null) => {
    cell.gem = null;
    cell.collector = { kind, color, need: layers, got: 0 };
  };

export const ELEMENTS: ElementDef[] = [
  // ── 하단 레이어 (보석 아래) ──────────────────────────────
  { id: 'grass', label: '잔디', category: 'lower', verified: true, note: '그 칸에서 보석이 터지면 벗겨진다', apply: ground('grass') },
  {
    id: 'jelly',
    label: '젤리',
    category: 'lower',
    verified: true,
    note: '옆 칸이 터지면 그리로 번진다. 판 전체를 덮는 게 목표다 - 없애는 게 아니다',
    apply: cell => {
      cell.ground = { kind: 'jelly', layers: 1, spreads: true };
    },
  },
  { id: 'marble', label: '대리석', category: 'lower', layers: 2, verified: false, note: '여러 겹짜리 하단 레이어', apply: ground('marble') },
  { id: 'soil', label: '흙', category: 'lower', verified: true, note: '버섯 아래 깔린 바닥. 버섯을 걷어내야 드러난다', apply: ground('soil') },

  // ── 상단 레이어 (보석 위) ────────────────────────────────
  { id: 'chain', label: '사슬', category: 'upper', verified: true, note: '보석을 붙잡는다. 일반 매치는 안 통하고 아이템으로 끊어야 한다', apply: cover('chain', { locks: true, powerUpOnly: true }) },

  { id: 'honey', label: '꿀', category: 'upper', verified: true, note: '보석을 붙잡아 못 움직이게 한다. 그 자리에서 매치해야 벗겨진다', apply: cover('honey', { locks: true }) },
  { id: 'dark-honey', label: '검은꿀', category: 'upper', layers: 2, verified: false, note: '꿀인데 여러 겹', apply: cover('dark-honey', { locks: true }) },
  { id: 'cloud', label: '구름', category: 'upper', verified: true, note: '아래에 무엇이 깔려 있는지 가린다. 걷어야 보인다', apply: cover('cloud', { hides: true }) },
  { id: 'roof', label: '지붕', category: 'upper', verified: false, note: '보석을 덮는 평범한 상단 레이어. 그 칸이 터지면 한 겹 벗겨진다', apply: cover('roof') },
  { id: 'force-field', label: '역장', category: 'upper', verified: false, note: '상단 레이어', apply: cover('force-field') },

  // ── 칸을 막는 장애물 ─────────────────────────────────────
  { id: 'box', label: '상자', category: 'blocker', verified: true, note: '옆에서 매치하면 부서진다', apply: blocker('box') },
  {
    id: 'bottle',
    label: '병',
    category: 'blocker',
    layers: 2,
    verified: true,
    // 보물지도는 칸에 놓이는 물건이 아니라 이 병들의 **진행 표시**다.
    // 병 하나를 깰 때마다 지도 조각이 하나 채워지고, 다 깨면 지도가 완성된다.
    // 그래서 카탈로그에는 병만 있고 지도는 레벨 목표로 표현된다.
    note: '옆에서 두 번 매치하면 깨진다. 다 깨면 보물지도가 완성된다',
    apply: blocker('bottle'),
  },
  { id: 'ice', label: '얼음', category: 'blocker', layers: 3, verified: true, note: '칸을 막는다. 옆에서 매치하거나 아이템으로 때리면 한 겹씩 깎인다', apply: blocker('ice') },
  { id: 'crate', label: '나무상자', category: 'blocker', layers: 3, verified: true, note: '판자가 여러 겹이라 여러 번 때려야 한다', apply: blocker('crate-heavy') },
  { id: 'log', label: '통나무', category: 'blocker', verified: false, note: '아래로 떨어뜨려 판 밖으로 빼낸다', apply: blocker('crate', { fallsOut: true }) },
  { id: 'barrel', label: '통', category: 'blocker', layers: 3, verified: true, note: '세 번 때리면 주변까지 크게 터진다', apply: blocker('barrel', { explodes: 1 }) },
  { id: 'safe', label: '금고', category: 'blocker', layers: 5, verified: true, note: '아이템으로 다섯 번 때려야 열린다', apply: blocker('safe', { powerUpOnly: true }) },
  { id: 'steel', label: '강철', category: 'blocker', layers: 2, verified: false, note: '일반 매치는 안 통하고 아이템만 통한다', apply: blocker('steel', { powerUpOnly: true }) },
  { id: 'vault', label: '고대금고', category: 'blocker', layers: 2, verified: false, note: '드러나기 전에는 정체를 모른다', apply: blocker('vault', { hidden: true }) },
  { id: 'bastion', label: '방패 구조물', category: 'blocker', layers: 2, verified: true, note: '방패를 폭발로 벗겨야 겹이 깎인다', apply: blocker('bastion', { shield: 1 }) },
  {
    id: 'mushroom',
    label: '버섯',
    category: 'blocker',
    verified: true,
    note: '옆에서 매치하면 사라지고 아래 흙이 드러난다. 한 턴에 하나도 못 없애면 흙 위에 다시 자란다',
    apply: (cell, layers) => {
      cell.gem = null;
      cell.blocker = { kind: 'mushroom', layers };
      // 버섯은 늘 흙을 깔고 앉아 있다. 걷어내면 그 흙이 드러나고,
      // 다시 자랄 자리도 그 흙이다.
      cell.ground = { kind: 'soil', layers: 1 };
    },
    hook: 'regrow',
  },
  {
    id: 'jelly-bomb',
    label: '젤리폭탄',
    category: 'blocker',
    layers: 7,
    verified: true,
    note: '아이템으로 일곱 번 때려야 깨진다. 깨지면 안에 든 젤리가 쏟아진다',
    apply: blocker('jelly-bomb', {
      powerUpOnly: true,
      spreads: { kind: 'jelly', layer: 'ground', radius: 1, grows: true },
    }),
  },
  { id: 'rubble', label: '잔해', category: 'blocker', verified: true, note: '골렘이 바닥에 닿으면 쏟아진다', apply: blocker('rubble') },
  { id: 'red-lock', label: '빨강자물쇠', category: 'blocker', verified: false, note: '지정된 색 매치로만 열린다', apply: blocker('red-lock', { color: 0 }) },

  // ── 이동 ────────────────────────────────────────────────
  { id: 'golem', label: '골렘', category: 'special', layers: 5, verified: true, note: '매 턴 한 칸 내려온다. 바닥에 닿으면 잔해를 쏟는다', apply: blocker('golem', { moving: true }), hook: 'golem' },
  {
    id: 'giant-golem',
    label: '거대 골렘',
    category: 'special',
    layers: 8,
    verified: true,
    note: '부서지면 작은 골렘 둘로 쪼개진다',
    apply: blocker('giant-golem', {
      moving: true,
      splitsInto: { kind: 'golem', layers: 3, count: 2, moving: true },
    }),
    hook: 'golem',
  },

  // ── 생성 ────────────────────────────────────────────────
  { id: 'mailbox', label: '우편함', category: 'generator', verified: true, note: '매 턴 옆 보석을 편지로 바꾼다', apply: blocker('mailbox', { produces: 'letter' }), hook: 'producer' },
  { id: 'magic-hat', label: '마법모자', category: 'generator', verified: false, note: '매 턴 무언가를 내놓는다', apply: blocker('magic-hat', { produces: 'trick' }), hook: 'producer' },
  { id: 'jar', label: '항아리', category: 'generator', verified: false, note: '매 턴 무언가를 내놓는다', apply: blocker('jar', { produces: 'drop' }), hook: 'producer' },
  { id: 'cauldron', label: '가마솥', category: 'generator', verified: false, note: '매 턴 무언가를 내놓는다', apply: blocker('cauldron', { produces: 'potion' }), hook: 'producer' },
  { id: 'seed-box', label: '씨앗상자', category: 'generator', verified: false, note: '매 턴 무언가를 내놓는다', apply: blocker('seed-box', { produces: 'seed' }), hook: 'producer' },
  { id: 'igloo', label: '이글루', category: 'generator', verified: false, note: '매 턴 무언가를 내놓는다', apply: blocker('igloo', { produces: 'snow' }), hook: 'producer' },

  // ── 그릇 ────────────────────────────────────────────────
  { id: 'shelf', label: '선반', category: 'container', layers: 3, verified: true, note: '떨어져 들어온 보석을 받아 담는다', apply: container('shelf') },
  { id: 'cupboard', label: '찬장', category: 'container', layers: 3, verified: false, note: '그릇', apply: container('cupboard') },
  { id: 'potion-bottle', label: '물약병', category: 'container', layers: 3, verified: false, note: '그릇', apply: container('potion-bottle') },
  { id: 'bird-house', label: '새집', category: 'container', layers: 3, verified: false, note: '그릇', apply: container('bird-house') },
  { id: 'bowling-box', label: '볼링박스', category: 'container', layers: 3, verified: false, note: '그릇', apply: container('bowling-box') },

  // ── 특수 ────────────────────────────────────────────────
  {
    id: 'tube',
    label: '금속관',
    category: 'special',
    verified: true,
    note: '그 열에 정해진 색만 내려보낸다',
    apply: (cell, _layers, color) => {
      cell.spawner = { color: (color ?? 0) as GemColor };
    },
  },
  {
    id: 'wall',
    label: '벽',
    category: 'special',
    verified: true,
    note: '칸 경계를 막는다. 레벨의 walls 목록으로 지정한다',
    apply: () => {
      /* 벽은 칸이 아니라 경계에 있어 여기서 적용하지 않는다 */
    },
  },
  { id: 'conveyor', label: '컨베이어벨트', category: 'container', verified: false, note: '경로를 따라 매 턴 한 칸씩 민다', apply: () => {}, hook: 'conveyor' },
  { id: 'tesla', label: '테슬라코일', category: 'special', verified: false, note: '매 턴 정해진 칸을 때린다', apply: () => {}, hook: 'zap' },
  { id: 'laser', label: '레이저', category: 'special', verified: false, note: '매 턴 정해진 칸을 때린다', apply: () => {}, hook: 'zap' },
  { id: 'fireworks', label: '폭죽', category: 'special', verified: false, note: '매 턴 정해진 칸을 때린다', apply: () => {}, hook: 'zap' },

  // ── 번지는 것들 ─────────────────────────────────────────
  // 치우면 사라지는 게 아니라 문제가 넓게 퍼진다. 한 칸을 없애는 대가로
  // 아홉 칸이 생기므로 "언제 터뜨리느냐"가 곧 난이도가 된다.
  {
    id: 'honey-pot',
    label: '꿀단지',
    category: 'blocker',
    verified: true,
    note: '부수면 주변 3x3에 꿀이 번진다',
    apply: blocker('honey-pot', { spreads: spread('honey', 'cover') }),
  },
  {
    id: 'flowerpot',
    label: '화분',
    category: 'blocker',
    layers: 2,
    verified: true,
    note: '부수면 주변 3x3에 잎이 깔린다',
    apply: blocker('flowerpot', { spreads: spread('leaf', 'ground') }),
  },
  {
    id: 'turtle',
    label: '거북',
    category: 'special',
    layers: 3,
    verified: true,
    note: '매 턴 내려오다 바닥에 닿으면 제 열에 잎을 깐다',
    apply: blocker('turtle', {
      moving: true,
      move: 'down',
      spreads: { kind: 'leaf', layer: 'ground', shape: 'column' },
    }),
    hook: 'golem',
  },
  {
    id: 'snowman',
    label: '눈사람',
    category: 'special',
    layers: 3,
    verified: false,
    note: '매 턴 옆으로 움직이고, 부서지면 주변을 얼린다',
    apply: blocker('snowman', {
      moving: true,
      move: 'path',
      spreads: spread('ice', 'cover'),
    }),
    hook: 'golem',
  },

  // ── 앞을 치워야 열리는 것들 ──────────────────────────────
  // requires 축: 판에 그 종류가 하나라도 남아 있으면 무적이다.
  // 순서를 강제하므로 "무엇부터 치울까"가 퍼즐이 된다.
  { id: 'ghost', label: '유령', category: 'blocker', verified: true, note: '때리면 부서진다. 묘비를 지키고 있다', apply: blocker('ghost') },
  {
    id: 'tombstone',
    label: '묘비',
    category: 'blocker',
    layers: 2,
    verified: true,
    note: '판의 유령을 모두 없애야 부술 수 있다',
    apply: blocker('tombstone', { requires: 'ghost' }),
  },
  { id: 'paint-bucket', label: '물감통', category: 'blocker', layers: 2, verified: true, note: '두 번 때리면 부서진다. 색섞개를 잠그고 있다', apply: blocker('paint-bucket') },
  {
    id: 'color-mixer',
    label: '색섞개',
    category: 'blocker',
    layers: 2,
    verified: true,
    note: '물감통을 모두 부숴야 열린다',
    apply: blocker('color-mixer', { requires: 'paint-bucket' }),
  },
  { id: 'metal-tower', label: '금속탑', category: 'blocker', layers: 2, verified: true, note: '아이템으로만 부서진다. 성을 지키고 있다', apply: blocker('metal-tower', { powerUpOnly: true }) },
  {
    id: 'castle',
    label: '성',
    category: 'blocker',
    layers: 3,
    verified: true,
    note: '금속탑을 모두 없애야 공격이 통한다',
    apply: blocker('castle', { requires: 'metal-tower' }),
  },

  // ── 여러 칸에 걸친 하나 ─────────────────────────────────
  {
    id: 'magic-wall',
    label: '마법의 벽',
    category: 'blocker',
    layers: 5,
    verified: true,
    note: '여러 칸에 걸쳐 있고 칸마다 다섯 번씩 때려야 한다',
    apply: blocker('magic-wall', { group: 'magic-wall' }),
  },
  {
    id: 'serpent-head',
    label: '돌뱀 머리',
    category: 'blocker',
    layers: 3,
    verified: true,
    note: '돌뱀은 머리로만 타격이 통한다. 머리가 부서지면 몸통까지 무너진다',
    apply: blocker('serpent-head', { group: 'serpent', weak: true, moving: true, move: 'path' }),
    hook: 'golem',
  },
  {
    id: 'serpent-body',
    label: '돌뱀 몸통',
    category: 'blocker',
    layers: 3,
    verified: true,
    note: '때려도 안 통한다. 머리를 노려야 한다',
    apply: blocker('serpent-body', { group: 'serpent' }),
  },

  // ── 부서지면서 무언가를 남기는 것들 ──────────────────────
  {
    id: 'electro-crate',
    label: '전기상자',
    category: 'blocker',
    layers: 2,
    verified: true,
    note: '부수면 그 자리에 라이트볼이 남는다',
    apply: blocker('electro-crate', { drops: 'lightball' }),
  },
  {
    id: 'firework-tower',
    label: '폭죽탑',
    category: 'blocker',
    layers: 3,
    verified: true,
    note: '부서지면 폭죽이 터져 넓은 범위를 친다',
    apply: blocker('firework-tower', { explodes: 2 }),
  },

  // ── 자리를 옮기는 것들 ──────────────────────────────────
  {
    id: 'giant-drill',
    label: '거대 드릴',
    category: 'special',
    layers: 3,
    verified: true,
    note: '매 턴 판의 다른 자리로 옮겨간다',
    apply: blocker('giant-drill', { moving: true, move: 'teleport' }),
    hook: 'golem',
  },
  {
    id: 'water-tower',
    label: '물탑',
    category: 'special',
    layers: 3,
    verified: true,
    note: '매 턴 좌우로 한 칸씩 왕복한다',
    apply: blocker('water-tower', { moving: true, move: 'sweep', dir: 1 }),
    hook: 'golem',
  },
  {
    id: 'scarecrow',
    label: '허수아비',
    category: 'generator',
    layers: 3,
    verified: true,
    note: '네 턴에 한 번 호박을 내놓는다',
    apply: blocker('scarecrow', { produces: 'pumpkin', everyN: 4 }),
    hook: 'producer',
  },
];

const BY_ID = new Map(ELEMENTS.map(e => [e.id, e]));

export function elementById(id: string): ElementDef | undefined {
  return BY_ID.get(id);
}

export function elementsByCategory(category: ElementCategory): ElementDef[] {
  return ELEMENTS.filter(e => e.category === category);
}

/**
 * 이 요소가 칸의 어느 층에 무슨 이름으로 놓이는지 알아낸다.
 *
 * 표에서 이름을 따로 적게 하지 않는 이유: id와 실제 kind가 다른 경우가 있다
 * (통나무 log -> crate, 나무상자 crate -> crate-heavy). 표를 고칠 때마다
 * 두 곳을 맞추게 하면 언젠가 어긋난다. 그래서 실제로 한 번 적용해 보고 읽는다.
 */
export function elementLayer(def: ElementDef): {
  layer: 'blocker' | 'cover' | 'ground' | 'collector' | 'spawner' | 'none';
  kind: string;
} {
  const cell: Cell = {
    exists: true,
    gem: null,
    blocker: null,
    cover: null,
    ground: null,
    walls: null,
    collector: null,
    spawner: null,
  };
  def.apply(cell, def.layers ?? 1, 0);
  if (cell.blocker) return { layer: 'blocker', kind: cell.blocker.kind };
  if (cell.cover) return { layer: 'cover', kind: cell.cover.kind };
  if (cell.ground) return { layer: 'ground', kind: cell.ground.kind };
  if (cell.collector) return { layer: 'collector', kind: cell.collector.kind };
  if (cell.spawner) return { layer: 'spawner', kind: 'tube' };
  return { layer: 'none', kind: def.id };
}

/** 아직 동작을 확인하지 못한 것들 - 레퍼런스를 플레이하며 채워야 할 목록 */
export function unverifiedElements(): ElementDef[] {
  return ELEMENTS.filter(e => !e.verified);
}

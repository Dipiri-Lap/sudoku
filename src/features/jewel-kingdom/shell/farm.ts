/**
 * 로비 가운데 농장: 레벨을 깨서 모은 별로 단계를 열면 농장 그림이 통째로 자란다.
 *
 * 단계마다 완성된 장면 한 장이다(꾸밈을 하나씩 얹지 않는다 - 그러면 따로 붙인 느낌이 난다).
 * 라이브 운영 전제: 업데이트마다 단계 그림 몇 장을 이 목록 끝에 더한다.
 *
 * 그림 만드는 법: 다음 단계는 이전 단계 그림을 Codex 수정(edit)으로 만든다. 그래야 구도·조명·
 * 울타리 위치가 이어져 "같은 땅이 자라는" 것으로 보인다. 볼거리는 가운데 폭 55%, 높이 22~82% 안에
 * 둔다(로비 양옆 이벤트 아이콘·아래 버튼을 피한다). generated-images/farm-stages-v2/run.sh 참고.
 */
export interface FarmStage {
  id: string;
  /** 이 걸음을 열 때 버튼·창에 보이는 이름 */
  name: string;
  /** 짓기 창 한 줄 설명 */
  desc: string;
  /** 이 걸음을 여는 데 드는 별(첫 그림은 0) */
  cost: number;
  img: string;
  /** 이 걸음에서 바뀌는 자리(장면 안 비율, 가운데 x·y). 먼지·망치질 연출을 여기서 한다 */
  focus: { x: number; y: number };
}

const F = '/assets/3match/farm';
const step = (i: number) => `${F}/step${i}.webp`;

/**
 * 앞마당: 버려진 빈터 + 걸음 10개. 판 한두 번에 한 걸음씩 바뀌어 "조금씩 자라는" 느낌을 준다.
 * 그림은 generated-images/farm-steps/run.sh(걸음마다 앞 그림을 Codex로 수정)로 만들고,
 * focus는 앞뒤 그림 차이에서 잰 값이다(scripts: farm-steps-focus).
 */
export const FARM_STAGES: FarmStage[] = [
  { id: 'wild', name: '버려진 빈터', desc: '잡초가 무성한 빈 땅이에요.', cost: 0, img: step(0), focus: { x: 0.5, y: 0.5 } },
  { id: 'weeds', name: '잡초 뽑기', desc: '무성한 잡초를 뽑아 땅을 드러내요.', cost: 1, img: step(1), focus: { x: 0.505, y: 0.394 } },
  { id: 'stump', name: '그루터기 치우기', desc: '그루터기·바위·마른 가지를 치워요.', cost: 1, img: step(2), focus: { x: 0.492, y: 0.617 } },
  { id: 'fence', name: '울타리 고치기', desc: '부서진 울타리를 반듯하게 고쳐요.', cost: 2, img: step(3), focus: { x: 0.505, y: 0.238 } },
  { id: 'gate', name: '나무 대문 달기', desc: '울타리 가운데에 튼튼한 대문을 달아요.', cost: 2, img: step(4), focus: { x: 0.53, y: 0.238 } },
  { id: 'path', name: '오솔길 내기', desc: '대문에서 아래로 흙길을 내요.', cost: 2, img: step(5), focus: { x: 0.497, y: 0.637 } },
  { id: 'beds-top', name: '위쪽 밭 만들기', desc: '길 양옆 위쪽에 밭 두 개를 일궈요.', cost: 3, img: step(6), focus: { x: 0.499, y: 0.416 } },
  { id: 'beds-bottom', name: '아래쪽 밭 만들기', desc: '아래쪽에도 밭 두 개를 일궈요. 이제 작물을 키울 수 있어요!', cost: 3, img: step(7), focus: { x: 0.499, y: 0.697 } },
  { id: 'scarecrow', name: '허수아비 세우기', desc: '새들로부터 밭을 지킬 허수아비를 세워요.', cost: 3, img: step(8), focus: { x: 0.502, y: 0.479 } },
  { id: 'props', name: '물뿌리개와 채소 상자', desc: '길가에 물뿌리개와 채소 상자를 둬요.', cost: 3, img: step(9), focus: { x: 0.507, y: 0.77 } },
  { id: 'flowers', name: '꽃 화단', desc: '밭 둘레에 알록달록 꽃을 심어요.', cost: 4, img: step(10), focus: { x: 0.498, y: 0.513 } },
];

/**
 * 걸음이 쌓일수록 늘어나는 생물(새 그림 없이 있는 그림을 움직인다). 이 걸음부터 나타난다.
 * "같은 장면인데 점점 북적인다"가 자라는 느낌을 준다.
 */
export const FARM_LIFE: { kind: 'butterfly' | 'ladybug' | 'frog' | 'petals'; from: number }[] = [
  { kind: 'butterfly', from: 2 },
  { kind: 'ladybug', from: 6 },
  { kind: 'frog', from: 8 },
  { kind: 'petals', from: 10 },
];

/** 장면 그림 가로/세로(1024×1536) */
export const FARM_RATIO = 1024 / 1536;
/** 장면 아래로 이어 칠할 잔디색 */
export const FARM_LAWN = '#758e05';

export function farmStage(i: number): FarmStage {
  return FARM_STAGES[Math.max(0, Math.min(i, FARM_STAGES.length - 1))];
}

/** 다음에 열 단계(없으면 null - 다음 업데이트를 기다린다) */
export function nextFarmStage(i: number): FarmStage | null {
  return FARM_STAGES[i + 1] ?? null;
}

// ───────────────────────── 밭 수확 ─────────────────────────
/**
 * 밭 4칸. 농장 2단계(밭 일구기)부터 쓸 수 있다. 빈 밭을 누르면 심고, 실제 시간이 지나면 다 익고,
 * 다 익은 밭을 누르면 코인을 받고 다시 빈 밭이 된다.
 *
 * 그림: 밭마다 같은 자리·같은 모양의 조각 세 장(빈 흙 / 자라는 중 / 다 익음)을 장면 위에 바꿔 끼운다.
 * 빈 흙은 2단계, 자라는 중은 3단계, 다 익음은 3단계를 수정한 그림에서 오려 냈다
 * (generated-images/farm-steps: 걸음10 그림, crops-grow.png, crops-ripe.png - 색 보정한 n-* 파일).
 * 3단계 장면에는 작물이 그려져 있지만 늘 셋 중 한 조각이 그 위를 덮으므로 밭 상태대로 보인다.
 */
export interface Crop {
  id: string;
  name: string;
  /** 다 익기까지(ms) */
  growMs: number;
  /** 수확 코인 */
  reward: number;
  /** 창에 보여 줄 채소 그림(판의 채소와 같은 그림) */
  icon: string;
}

export const CROPS: Record<string, Crop> = {
  tomato: { id: 'tomato', name: '토마토', growMs: 5 * 60_000, reward: 20, icon: '/assets/3match/gems/gem-0.png' },
  cabbage: { id: 'cabbage', name: '양배추', growMs: 15 * 60_000, reward: 30, icon: '/assets/3match/gems/gem-1.png' },
  corn: { id: 'corn', name: '옥수수', growMs: 30 * 60_000, reward: 60, icon: '/assets/3match/gems/gem-3.png' },
  carrot: { id: 'carrot', name: '당근', growMs: 60 * 60_000, reward: 100, icon: '/assets/3match/gems/gem-5.png' },
};

export interface Plot {
  id: string;
  crop: string;
  /** 조각 위치·폭(장면 그림 안 비율) */
  left: number;
  top: number;
  width: number;
  /** 표시(심기·남은 시간·수확!)를 띄울 밭 가운데 */
  cx: number;
  cy: number;
}

/** 밭 수확이 열리는 걸음(아래쪽 밭까지 일군 뒤) */
export const PLOTS_FROM_STAGE = 7;

/** 남은 1분마다 코인 2개(최소 10)로 바로 익힌다 */
export function finishCost(remainMs: number): number {
  return Math.max(10, Math.ceil(remainMs / 60_000) * 2);
}

/** 밭 4칸(조각 위치는 오려 내기 스크립트가 잰 값) */
export const PLOTS: Plot[] = [
  { id: 'ul', crop: 'tomato', left: 0.2764, top: 0.2207, width: 0.1953, cx: 0.374, cy: 0.402 },
  { id: 'ur', crop: 'cabbage', left: 0.5273, top: 0.2174, width: 0.1934, cx: 0.624, cy: 0.4 },
  { id: 'll', crop: 'corn', left: 0.2148, top: 0.4564, width: 0.2295, cx: 0.329, cy: 0.681 },
  { id: 'lr', crop: 'carrot', left: 0.5547, top: 0.4577, width: 0.2275, cx: 0.668, cy: 0.678 },
];

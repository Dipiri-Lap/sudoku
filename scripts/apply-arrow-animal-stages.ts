/**
 * 동물 실루엣(animals.png)을 스테이지 10~90(10 간격)에 직접 배치한다.
 *
 * 무작위 추첨이 아니라 "어느 자리에 어느 동물을 넣을지"를 아래 SLOTS 로 고정하고,
 * 각 자리의 난이도는 이웃 스테이지의 곡선(trend)에 맞춘다:
 *   목표 = 이웃(모양·하이라이트 제외) 난이도 중앙값 × SHAPE_MULT
 * 목표에 가장 가까운 (판 크기, 피스 수) 조합을 후보를 만들어 측정한 뒤 고른다.
 * 나머지 스테이지는 건드리지 않는다(stages.json 을 통째로 다시 뽑지 않는다).
 *
 *   npx tsx scripts/apply-arrow-animal-stages.ts            # SLOTS 전부
 *   npx tsx scripts/apply-arrow-animal-stages.ts --only=10  # 해당 자리들만 다시 뽑는다(쉼표로 여러 개)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { generateShapedLevel, generateRegionedLevel } from '../src/features/arrow-puzzle/utils/levelGenerator';
import type { LevelData, Direction, PieceData } from '../src/features/arrow-puzzle/data/levels';
import { SHAPES, buildMask, fitMask, shapeFromGrid } from '../src/features/arrow-puzzle/utils/shapes';

const STAGES_PATH = 'src/features/arrow-puzzle/data/stages.json';

// 쉐이프는 이웃보다 살짝 어렵게.
const SHAPE_MULT = 1.25;

// 자리 → 동물. 난이도가 오를수록 판도 커진다. 작은 판에서도 윤곽이 살아 있는 동물(펭귄·토끼·강아지)을 앞에,
// 가시·눈 같은 잔 디테일이 있는 동물(고슴도치·판다)을 큰 판이 나오는 뒤쪽에 둔다.
// sides: 그 자리만 쓸 판 크기(생략하면 기본 SIDES). counts: 피스 수 후보(생략하면 기본).
// mult: 그 자리만 쓸 난이도 배율(생략하면 SHAPE_MULT). 하이라이트 자리(5, 15, 25...)는 곡선의 1.6배를 노린다.
// split: 모양을 두 영역(부분 마스크 + 나머지)으로 나눠 영역별로 화살을 따로 만든다 — 피스가 경계를 넘지 않아
//   경계가 또렷하게 보이고, 영역마다 다른 색을 쓴다. crustKey 는 emoji-masks.json 의 부분 마스크 키.
//   minComponent: 지정하면 "영역마다 가장 큰 덩어리만 남김" 대신, 이 칸 수 미만의 낱조각만 반대 영역으로 넘긴다
//   (한 영역이 여러 덩어리로 나뉘는 모양 — 물고기의 꼬리·아가미 구멍처럼 — 용).
interface Split { partKey: string; partPalette: string[]; restPalette: string[]; minComponent?: number }
// multi: 부분 마스크를 여러 개 지정해 (부분들 + 나머지) 여러 영역으로 나눈다 — 색이 여럿인 그림(폭탄의 몸통·심지·불꽃)용.
//   앞에 적은 부분이 우선하고, 어느 부분에도 안 속한 칸이 나머지 영역이 된다.
interface Multi { parts: { key: string; palette: string[] }[]; restPalette: string[] }
// minCells: 이 칸 수 미만의 떨어진 덩어리는 통째로 버린다(생략하면 3) — 얇은 잔조각이 많은 그림용.
const SLOTS: { level: number; shape: string; sides?: number[]; counts?: number[]; mult?: number; split?: Split; multi?: Multi; palette?: string[]; minCells?: number }[] = [
  { level: 10, shape: '펭귄', sides: [14, 16, 18], counts: [6, 7, 8, 9, 10, 12, 14] },
  { level: 20, shape: '픽셀 토끼', sides: [18, 20] },
  { level: 30, shape: '강아지', sides: [20] },
  { level: 40, shape: '부엉이', sides: [22] },
  { level: 50, shape: '픽셀 고양이', sides: [22, 24] },
  { level: 60, shape: '다람쥐', sides: [24] },
  { level: 70, shape: '여우', sides: [24, 26] },
  { level: 80, shape: '고슴도치', sides: [26] },
  // 하이라이트 자리에 오각별 — 꼭짓점이 또렷하게 남도록 24칸 이상에서 만든다.
  { level: 105, shape: '오각별', sides: [24, 26, 28], counts: [12, 14, 16, 18, 20, 24, 28, 32], mult: 1.6 },
  // 위쪽 가운데가 파이고 아래가 뾰족한 하트 — 20칸 이상에서 윤곽이 또렷하다.
  // 하이라이트 자리에 햄버거 — 이미지 색에 맞춰 초록 양상추, 빨간 토마토·보라 양파, 노란 치즈, 갈색 패티, 주황 빵(기본)을 층별 영역으로 나눈다.
  {
    level: 275, shape: '햄버거', sides: [30, 32], counts: [56, 66, 76, 88], mult: 1.6,
    multi: {
      parts: [
        { key: 'burger_lettuce', palette: ['#22c55e', '#16a34a', '#4ade80'] },
        { key: 'burger_tomato', palette: ['#ef4444', '#dc2626', '#a855f7'] },
        { key: 'burger_cheese', palette: ['#facc15', '#fbbf24'] },
        { key: 'burger_patty', palette: ['#78350f', '#92400e', '#57340f'] },
      ],
      restPalette: ['#f59e0b', '#fb923c', '#f97316', '#d97706'],
    },
  },
  // 선물상자 — 이미지 색에 맞춰 빨간 리본·나비 매듭, 크림색 상자(기본)를 영역으로 나눈다.
  {
    level: 280, shape: '선물상자', sides: [30, 32], counts: [56, 66, 76, 88],
    multi: {
      parts: [{ key: 'gift_ribbon', palette: ['#ef4444', '#dc2626', '#b91c1c'] }],
      restPalette: ['#fef3c7', '#fde68a', '#fcd9b6', '#f5e6d3'],
    },
  },
  // 하이라이트 자리에 등불 — 이미지 색에 맞춰 노랑·주황으로 빛나는 유리와 청동색 틀(기본)을 영역으로 나눈다.
  {
    level: 285, shape: '등불', sides: [32, 34], counts: [80, 96, 112, 130], mult: 1.6,
    multi: {
      parts: [{ key: 'lantern_glow', palette: ['#facc15', '#fbbf24', '#fde047', '#f59e0b'] }],
      restPalette: ['#b45309', '#92400e', '#d97706', '#78350f'],
    },
  },
  // 원숭이 — 원본이 흑백이라 검은 털·눈·윤곽(짙은 회색 화살)과 흰 얼굴·배(흰색 화살)를 영역으로 나눠 흑백 무늬를 살린다.
  {
    level: 290, shape: '원숭이', sides: [30, 32], counts: [56, 66, 76, 88],
    split: { partKey: 'monkey_dark', partPalette: ['#475569', '#334155', '#64748b'], restPalette: ['#f8fafc', '#e2e8f0'], minComponent: 3 },
  },
  // 하이라이트 자리에 기타 — 검은 윤곽·줄받침·사운드홀(회색 화살)과 안쪽 흰 몸통(흰색 화살)을 영역으로 나눠 아이콘의 무늬를 살린다.
  {
    level: 295, shape: '기타', sides: [32, 34], counts: [100, 115, 130, 150], mult: 1.6,
    split: { partKey: 'guitar_line', partPalette: ['#475569', '#334155', '#64748b'], restPalette: ['#f8fafc', '#e2e8f0'], minComponent: 3 },
  },
  // 장난감 자동차 — 이미지 색에 맞춰 파란 창문, 노란 전조등, 회색 바퀴·범퍼, 빨간 차체(기본)를 영역으로 나눈다.
  {
    level: 300, shape: '장난감 자동차', sides: [30, 32], counts: [46, 56, 66, 76],
    multi: {
      parts: [
        { key: 'toycar_lights', palette: ['#facc15', '#fbbf24'] },
        { key: 'toycar_window', palette: ['#60a5fa', '#3b82f6', '#93c5fd'] },
        { key: 'toycar_gray', palette: ['#94a3b8', '#64748b', '#cbd5e1'] },
      ],
      restPalette: ['#ef4444', '#dc2626', '#f87171', '#b91c1c'],
    },
  },
  // 하이라이트 자리에 카메라 — 이미지 색에 맞춰 갈색 가죽 끈, 보라·파랑 렌즈 유리, 은색·회색 본체(기본)를 영역으로 나눈다.
  // (처음 275번 → 햄버거에 밀려 280번 → 선물상자에 밀려 285번 → 등불에 밀려 290번 → 원숭이에 밀려 295번 → 기타에 밀려 300번 → 자동차에 밀려 305번으로 옮겼다.)
  {
    level: 305, shape: '카메라', sides: [32, 34], counts: [100, 115, 130, 150], mult: 1.6, minCells: 14,
    multi: {
      parts: [
        { key: 'camera_strap', palette: ['#b45309', '#92400e', '#d97706'] },
        { key: 'camera_glass', palette: ['#6d28d9', '#4f46e5', '#818cf8'] },
      ],
      restPalette: ['#94a3b8', '#64748b', '#cbd5e1', '#334155'],
    },
  },
  // UFO — 이미지 색에 맞춰 파란 돔, 주황 창, 하늘색 빛줄기, 회색 접시(기본)를 영역으로 나눈다. 주위에 떠 있는 별과 구슬은 제외했다.
  {
    level: 270, shape: 'UFO', sides: [30, 32], counts: [56, 66, 76, 88],
    multi: {
      parts: [
        { key: 'ufo_lights', palette: ['#f59e0b', '#f97316', '#fbbf24'] },
        { key: 'ufo_dome', palette: ['#2563eb', '#3b82f6', '#60a5fa'] },
        { key: 'ufo_beam', palette: ['#67e8f9', '#22d3ee', '#a5f3fc'] },
      ],
      restPalette: ['#94a3b8', '#64748b', '#cbd5e1', '#475569'],
    },
  },
  // 하이라이트 자리에 악어 — 원본이 흑백이라 검은 비늘·눈·윤곽(짙은 회색 화살)과 흰 주둥이·배(흰색 화살)를 영역으로 나눈다.
  {
    level: 265, shape: '악어', sides: [30, 32], counts: [56, 66, 76, 88], mult: 1.6,
    split: { partKey: 'croc_dark', partPalette: ['#475569', '#334155', '#64748b'], restPalette: ['#f8fafc', '#e2e8f0'], minComponent: 3 },
  },
  // 앵무새 — 원본이 흑백이라 검은 깃털·눈·윤곽(짙은 회색 화살)과 흰 무늬(흰색 화살)를 영역으로 나눠 흑백 무늬를 살린다.
  {
    level: 260, shape: '앵무새', sides: [30, 32], counts: [46, 56, 66, 76],
    split: { partKey: 'parrot_dark', partPalette: ['#475569', '#334155', '#64748b'], restPalette: ['#f8fafc', '#e2e8f0'], minComponent: 3 },
  },
  // 눈사람 — 이미지 색에 맞춰 빨간 모자·목도리, 갈색 나뭇가지 팔, 흰 눈사람(기본)을 영역으로 나눈다. 주위에 떠 있는 눈덩이는 제외했다.
  // (250번에 있던 큰 개구리는 이 슬롯으로 대체되었다. 개구리를 다시 넣으려면 shapes.ts 의 '개구리 그림' 모양으로 아래 옛 설정을 다른 번호에 쓰면 된다.
  //  옛 설정: level: 250, shape: '개구리 그림', sides: [32, 34], counts: [50, 60, 72, 86, 100, 120], palette: ['#22c55e', '#16a34a', '#4ade80', '#15803d'])
  {
    level: 250, shape: '눈사람', sides: [30, 32], counts: [56, 66, 76, 88],
    multi: {
      parts: [
        { key: 'snowman_red', palette: ['#ef4444', '#dc2626', '#b91c1c'] },
        { key: 'snowman_arms', palette: ['#92400e', '#78350f', '#b45309'] },
      ],
      restPalette: ['#f8fafc', '#e2e8f0', '#cbd5e1', '#bfdbfe'],
    },
  },
  // 하이라이트 자리에 보물상자 — 이미지 색에 맞춰 금색 띠·자물쇠, 갈색 나무(기본)를 영역으로 나눈다. 열쇠 구멍은 빈 칸이다.
  // (255번에 있던 폭탄은 이 슬롯으로 대체되었다. 폭탄을 다시 넣으려면 아래 옛 설정을 다른 번호로 옮겨 쓰면 된다.)
  //     {
  //       level: 255, shape: '폭탄', sides: [32, 34], counts: [90, 105, 120, 140, 160], mult: 1.6,
  //       multi: {
  //         parts: [
  //           { key: 'bomb_spark', palette: ['#ef4444', '#f97316', '#facc15', '#fde047'] },
  //           { key: 'bomb_fuse', palette: ['#b45309', '#92400e'] },
  //         ],
  //         restPalette: ['#71717a', '#52525b', '#a1a1aa'],
  //       },
  //     },
  {
    level: 255, shape: '보물상자', sides: [30, 32], counts: [56, 66, 76, 88], mult: 1.6,
    multi: {
      parts: [{ key: 'chest_gold', palette: ['#facc15', '#fbbf24', '#f59e0b', '#eab308'] }],
      restPalette: ['#92400e', '#78350f', '#b45309', '#a16207'],
    },
  },
  // 하이라이트 자리에 야자수 섬 — 이미지 색에 맞춰 파란 바다, 갈색 줄기, 노란 모래, 초록 잎(기본)을 영역으로 나눈다.
  {
    level: 245, shape: '야자수 섬', sides: [30, 32], counts: [56, 66, 76, 88], mult: 1.6,
    multi: {
      parts: [
        { key: 'palm_island_water', palette: ['#38bdf8', '#0ea5e9', '#7dd3fc'] },
        { key: 'palm_island_trunk', palette: ['#b45309', '#92400e', '#d97706'] },
        { key: 'palm_island_sand', palette: ['#fde68a', '#fcd34d', '#fbbf24'] },
      ],
      restPalette: ['#22c55e', '#16a34a', '#4ade80', '#15803d'],
    },
  },
  // 우주인 — 이미지 색에 맞춰 짙은 남색 헬멧 유리, 파란 장갑·부츠, 빨강·주황 배낭, 흰 우주복(기본)으로 나눈다. 떠 있는 별은 제외했다.
  {
    level: 240, shape: '우주인', sides: [30, 32], counts: [56, 66, 76, 88],
    multi: {
      parts: [
        { key: 'astronaut_visor', palette: ['#1e3a8a', '#172554', '#1e40af'] },
        { key: 'astronaut_blue', palette: ['#2563eb', '#3b82f6', '#1d4ed8'] },
        { key: 'astronaut_red', palette: ['#ef4444', '#f97316', '#dc2626'] },
      ],
      restPalette: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
    },
  },
  // 하이라이트 자리에 게임패드 — 이미지 색에 맞춰 색색의 버튼(파랑·초록·빨강·노랑), 어두운 회색(십자키·케이블·윤곽), 흰/연보라 몸통(기본)으로 나눈다.
  {
    level: 235, shape: '게임패드', sides: [30, 32], counts: [46, 56, 66, 76], mult: 1.6,
    multi: {
      parts: [
        { key: 'gamepad_buttons', palette: ['#3b82f6', '#22c55e', '#ef4444', '#eab308'] },
        { key: 'gamepad_dark', palette: ['#475569', '#334155', '#64748b'] },
      ],
      restPalette: ['#f8fafc', '#e2e8f0', '#c7d2fe'],
    },
  },
  // 선인장 — 이미지 색에 맞춰 주황 화분, 분홍 꽃, 초록 선인장(기본)을 영역으로 나눈다.
  {
    level: 230, shape: '선인장', sides: [28, 30, 32], counts: [46, 56, 66, 76],
    multi: {
      parts: [
        { key: 'cactus_pot', palette: ['#ea580c', '#c2410c', '#f97316'] },
        { key: 'cactus_flower', palette: ['#ec4899', '#f472b6', '#facc15'] },
      ],
      restPalette: ['#22c55e', '#16a34a', '#4ade80', '#15803d'],
    },
  },
  // 하이라이트 자리에 화려한 왕관 — 이미지 색에 맞춰 빨간 벨벳, 파란 보석, 금색 틀(기본)을 영역으로 나눈다.
  {
    level: 225, shape: '화려한 왕관', sides: [30, 32], counts: [50, 60, 72, 86], mult: 1.6,
    multi: {
      parts: [
        { key: 'royal_crown_red', palette: ['#ef4444', '#dc2626', '#b91c1c'] },
        { key: 'royal_crown_blue', palette: ['#3b82f6', '#2563eb', '#60a5fa'] },
      ],
      restPalette: ['#facc15', '#fbbf24', '#f59e0b', '#eab308'],
    },
  },
  // 아기 공룡 — 이미지 색에 맞춰 주황 날개·등 뿔, 크림색 배·뿔·발톱, 초록 몸통(기본)을 영역으로 나눈다.
  {
    level: 220, shape: '아기 공룡', sides: [30, 32], counts: [46, 56, 66, 76],
    multi: {
      parts: [
        { key: 'dragon_orange', palette: ['#f97316', '#fb923c', '#f59e0b'] },
        { key: 'dragon_cream', palette: ['#fde68a', '#fef3c7'] },
      ],
      restPalette: ['#22c55e', '#16a34a', '#4ade80', '#15803d'],
    },
  },
  // 하이라이트 자리에 해바라기 — 이미지 색에 맞춰 갈색 씨앗판, 초록 잎, 노랑·주황 꽃잎(기본)을 영역으로 나눈다.
  {
    level: 215, shape: '해바라기', sides: [30, 32], counts: [50, 60, 72, 86], mult: 1.6,
    multi: {
      parts: [
        { key: 'sunflower_disc', palette: ['#78350f', '#92400e', '#a16207'] },
        { key: 'sunflower_leaf', palette: ['#16a34a', '#22c55e', '#15803d'] },
      ],
      restPalette: ['#facc15', '#fbbf24', '#f59e0b', '#eab308'],
    },
  },
  // 거북이 — 이미지 색에 맞춰 주황 갈색 등껍질, 연한 크림색 얼굴·배, 청록 몸통·지느러미(기본)를 영역으로 나눈다.
  {
    level: 210, shape: '거북이', sides: [30, 32], counts: [46, 56, 66, 76],
    multi: {
      parts: [
        { key: 'turtle_shell', palette: ['#ea580c', '#c2410c', '#f97316', '#b45309'] },
        { key: 'turtle_cream', palette: ['#fef3c7', '#fde68a'] },
      ],
      restPalette: ['#14b8a6', '#2dd4bf', '#0d9488', '#5eead4'],
    },
  },
  // 하이라이트 자리에 귀여운 고래 — 이미지 색에 맞춰 흰 배(연한 색 화살)와 파란 몸통(기본)을 영역으로 나눈다. 눈은 빈 칸이다.
  {
    level: 205, shape: '귀여운 고래', sides: [30, 32], counts: [40, 48, 56, 66], mult: 1.6,
    multi: {
      parts: [{ key: 'whale_cute_belly', palette: ['#f8fafc', '#e0f2fe', '#bae6fd'] }],
      restPalette: ['#3b82f6', '#2563eb', '#60a5fa', '#1d4ed8'],
    },
  },
  // 마법사 모자 — 이미지 색에 맞춰 보라색 모자(기본), 주황 띠, 띠 위의 노란 별을 영역으로 나눈다. 모자 옆의 반짝이는 별은 제외했다.
  {
    level: 200, shape: '마법사 모자', sides: [30, 32], counts: [40, 48, 56, 66],
    multi: {
      parts: [
        { key: 'wizard_star', palette: ['#facc15', '#fde047'] },
        { key: 'wizard_band', palette: ['#d97706', '#b45309'] },
      ],
      restPalette: ['#7c3aed', '#8b5cf6', '#6d28d9', '#a78bfa'],
    },
  },
  // 하이라이트 자리에 종 — 이미지 색에 맞춰 빨간 리본, 종 입구 안쪽의 갈색, 금색 종(기본)을 영역으로 나눈다.
  {
    level: 195, shape: '종', sides: [30, 32], counts: [46, 56, 66, 76], mult: 1.6,
    multi: {
      parts: [
        { key: 'bell_bow', palette: ['#ef4444', '#dc2626', '#f87171'] },
        { key: 'bell_inside', palette: ['#92400e', '#78350f'] },
      ],
      restPalette: ['#fbbf24', '#f59e0b', '#fcd34d', '#eab308'],
    },
  },
  // 알람시계 — 이미지 색에 맞춰 크림색 얼굴, 금색 꼭지·발, 빨간 몸통·종(기본)을 영역으로 나눈다. 바늘·눈금은 가늘어 판에는 거의 안 나온다.
  {
    level: 190, shape: '시계', sides: [30, 32], counts: [34, 40, 46, 54],
    multi: {
      parts: [
        { key: 'clock_face', palette: ['#fef3c7', '#fff7ed'] },
        { key: 'clock_gold', palette: ['#facc15', '#eab308'] },
      ],
      restPalette: ['#ef4444', '#dc2626', '#f87171'],
    },
  },
  // 하이라이트 자리에 다이아몬드 — 이미지 색조에 맞춰 흰색·연한 하늘색 면, 짙은 파랑 면, 밝은 파랑(기본) 영역으로 나눈다.
  {
    level: 185, shape: '다이아몬드', sides: [30, 32], counts: [46, 56, 68, 82, 96], mult: 1.6,
    multi: {
      parts: [
        { key: 'diamond_light', palette: ['#f8fafc', '#e0f2fe', '#bae6fd'] },
        { key: 'diamond_deep', palette: ['#0369a1', '#075985', '#1d4ed8'] },
      ],
      restPalette: ['#38bdf8', '#0ea5e9', '#7dd3fc'],
    },
  },
  // 네잎클로버 — 원본 도트 그림은 네 잎이 한 덩어리로 뭉쳐 알아보기 어려워 하트 모양 잎 네 장을 도형으로 직접 그렸다
  // (shapes.ts 의 cloverDrawing). 위·아래의 갈라진 홈과 좌우의 잘록한 허리, 줄기로 네 잎이 읽힌다. 초록 계열 팔레트.
  {
    level: 180, shape: '네잎클로버', sides: [28, 30, 32], counts: [30, 36, 44, 54, 66],
    palette: ['#22c55e', '#16a34a', '#4ade80', '#15803d'],
  },
  // 하이라이트 자리에 케이크 — 이미지 색에 맞춰 딸기 잎(초록), 딸기·잼(빨강), 크림(흰색), 스펀지(노랑)를 영역으로 나눈다.
  {
    level: 175, shape: '케이크', sides: [30, 32], counts: [36, 44, 52, 60, 72], mult: 1.6,
    multi: {
      parts: [
        { key: 'cake_leaf', palette: ['#22c55e', '#16a34a'] },
        { key: 'cake_red', palette: ['#ef4444', '#dc2626', '#f87171'] },
        { key: 'cake_cream', palette: ['#fff7ed', '#f8fafc'] },
      ],
      restPalette: ['#fcd34d', '#fbbf24', '#f59e0b'],
    },
  },
  // 음표 — 검은 윤곽(회색 화살)과 안쪽 흰 면(흰색 화살)을 영역으로 나눠 원본의 "검은 테두리 + 흰 면" 느낌을 낸다.
  // 양옆의 반짝이는 별은 음표와 떨어진 별도 덩어리다.
  {
    level: 170, shape: '음표', sides: [28, 32], counts: [40, 50, 60, 72, 86],
    split: { partKey: 'note_line', partPalette: ['#94a3b8', '#64748b', '#a8b3c4'], restPalette: ['#f8fafc', '#e2e8f0'], minComponent: 3 },
  },
  // 하이라이트 자리에 바나나 — 이미지 색에 맞춰 벗겨진 크림색 속살과 노랑 껍질을 영역으로 나눈다.
  {
    level: 165, shape: '바나나', sides: [30, 32], counts: [50, 60, 72, 86, 100], mult: 1.6,
    multi: {
      parts: [{ key: 'banana_fruit', palette: ['#fef3c7', '#fde68a', '#fffbeb'] }],
      restPalette: ['#facc15', '#eab308', '#f59e0b'],
    },
  },
  // 트로피 — 이미지 색에 맞춰 금색 컵·손잡이(기본), 컵 가운데의 적갈색 별, 갈색 받침을 영역으로 나눈다.
  {
    level: 160, shape: '트로피', sides: [30, 32], counts: [30, 36, 44, 54, 66],
    multi: {
      parts: [
        { key: 'trophy_star', palette: ['#9a3412', '#7c2d12'] },
        { key: 'trophy_base', palette: ['#b45309', '#92400e'] },
      ],
      restPalette: ['#fbbf24', '#f59e0b', '#fcd34d', '#eab308'],
    },
  },
  // 하이라이트 자리에 해골 — 두 눈구멍·코 구멍과 떨어진 턱이 뭉개지지 않도록 24칸 이상에서 만든다.
  { level: 155, shape: '해골', sides: [24, 26, 28], counts: [14, 16, 18, 20, 24, 28, 32], mult: 1.6 },
  // 물고기 아이콘 — 윤곽·아가미·눈(파랑)과 채워진 안쪽 면(연노랑)을 영역으로 나눠 아이콘의 무늬를 화살로 살린다.
  // 선 영역이 얇은 고리라 판이 크면(500칸 이상) 생성이 거의 실패하므로 22~24칸에서 만든다.
  {
    level: 150, shape: '물고기 아이콘', sides: [22, 24], counts: [16, 20, 24, 28, 34, 40],
    split: { partKey: 'fish_pix_line', partPalette: ['#38bdf8', '#0ea5e9'], restPalette: ['#fde68a', '#fbbf24'], minComponent: 5 },
  },
  // 하이라이트 자리에 왕관 — 속이 빈 테두리와 아래 받침 막대가 끊기지 않도록 28칸 이상에서 만든다.
  { level: 145, shape: '왕관', sides: [28, 30, 32], counts: [14, 16, 18, 20, 24, 28, 32], mult: 1.6 },
  // 닻 — 위쪽 고리 구멍과 가늘게 굽은 팔이 뭉개지지 않도록 28칸 이상에서 만든다.
  { level: 140, shape: '닻', sides: [28, 32], counts: [14, 16, 18, 20, 24, 28, 32] },
  // 하이라이트 자리에 스시 — 회(주황)와 밥(흰색)을 영역으로 나눠 화살이 구분되게 한다.
  {
    level: 135, shape: '스시', sides: [26, 28], counts: [14, 16, 18, 20, 24, 28, 32], mult: 1.6,
    split: { partKey: 'sushi_fish', partPalette: ['#fb923c', '#f97316'], restPalette: ['#f8fafc', '#cbd5e1'] },
  },
  // 딸기 — 잎(초록)과 열매(빨강)를 영역으로 나눠 화살이 구분되게 한다. 잎과 열매 사이의 틈이 남도록 28칸 이상.
  {
    level: 130, shape: '딸기', sides: [28, 30], counts: [14, 16, 18, 20, 24, 28, 32],
    split: { partKey: 'strawberry_leaf', partPalette: ['#22c55e', '#16a34a'], restPalette: ['#ef4444', '#dc2626'] },
  },
  // 하이라이트 자리에 피자 조각 — 끝이 뾰족한 쐐기가 뭉개지지 않도록 26칸 이상에서 만든다.
  // 빵 테두리(주황)와 토핑 부분(노랑)을 영역으로 나눠 화살이 구분되게 한다.
  {
    level: 125, shape: '피자', sides: [26, 28], counts: [14, 16, 18, 20, 24, 28, 32], mult: 1.6,
    split: { partKey: 'pizza_crust', partPalette: ['#f59e0b', '#ea580c'], restPalette: ['#fde68a', '#facc15'] },
  },
  // 도넛 — 가운데 구멍이 또렷하게 보이도록 22칸 이상에서 만든다.
  { level: 120, shape: '도넛', sides: [22, 24], counts: [12, 14, 16, 18, 20, 24, 28] },
  // 하이라이트 자리에 체리 — 28칸부터 두 열매 사이 틈이 생겨 두 알로 읽힌다(24칸은 붙어 버린다).
  { level: 115, shape: '체리', sides: [28, 30], counts: [14, 16, 18, 20, 24, 28, 32, 36], mult: 1.6 },
  { level: 110, shape: '하트', sides: [20, 22, 24], counts: [12, 14, 16, 18, 20, 24, 28] },
  { level: 90, shape: '판다', sides: [26, 28], counts: [14, 16, 18, 20, 22, 24, 28, 32, 36] },
];

// 알아볼 수 있는 최소 크기(shapes.ts 의 minSide)에서 조금씩 키워 본다.
const SIDES = [24, 26];
const PIECE_COUNTS = [8, 10, 12, 14, 16, 18, 20, 24, 28];
const PER_COMBO = 2;      // 조합마다 만들어 볼 후보 수
const SHORTLIST = 6;      // 대충 잰 값으로 추린 뒤 정밀 측정할 후보 수

// ── 난이도 측정 (generate-arrow-levels.ts 와 동일한 방식) ──────────────────────

function selfBlocked(cells: [number, number][], dir: Direction): boolean {
  const n = cells.length;
  const [hc, hr] = cells[n - 1];
  for (let i = 0; i < n - 1; i++) {
    const [bc, br] = cells[i];
    let d = 0;
    if (dir === 'right' && br === hr && bc > hc) d = bc - hc;
    if (dir === 'left' && br === hr && bc < hc) d = hc - bc;
    if (dir === 'up' && bc === hc && br < hr) d = hr - br;
    if (dir === 'down' && bc === hc && br > hr) d = br - hr;
    if (d > 0 && i >= d) return true;
  }
  return false;
}

function canEscape(p: PieceData, occ: Set<string>, cols: number, rows: number): boolean {
  if (selfBlocked(p.cells, p.exitDir)) return false;
  const [hc, hr] = p.cells[p.cells.length - 1];
  switch (p.exitDir) {
    case 'right': for (let c = hc + 1; c < cols; c++) if (occ.has(`${c},${hr}`)) return false; return true;
    case 'left':  for (let c = hc - 1; c >= 0; c--)  if (occ.has(`${c},${hr}`)) return false; return true;
    case 'up':    for (let r = hr - 1; r >= 0; r--)  if (occ.has(`${hc},${r}`)) return false; return true;
    case 'down':  for (let r = hr + 1; r < rows; r++) if (occ.has(`${hc},${r}`)) return false; return true;
  }
}

function searchCost(lv: LevelData): number | null {
  let ps = [...lv.pieces];
  const occ = new Set<string>(ps.flatMap(p => p.cells.map(([c, r]) => `${c},${r}`)));
  let cost = 0;
  while (ps.length) {
    const open = ps.filter(p => {
      for (const [c, r] of p.cells) occ.delete(`${c},${r}`);
      const ok = canEscape(p, occ, lv.gridCols, lv.gridRows);
      for (const [c, r] of p.cells) occ.add(`${c},${r}`);
      return ok;
    });
    if (open.length === 0) return null;
    cost += ps.length / open.length - 1;
    const pick = open[Math.floor(Math.random() * open.length)];
    for (const [c, r] of pick.cells) occ.delete(`${c},${r}`);
    ps = ps.filter(p => p.id !== pick.id);
  }
  return cost;
}

function measure(lv: LevelData, runs: number): number | null {
  let sum = 0;
  for (let i = 0; i < runs; i++) {
    const c = searchCost(lv);
    if (c === null) return null;
    sum += c;
  }
  return sum / runs;
}

// ── 배치 ─────────────────────────────────────────────────────────────────────

interface Stage extends LevelData {
  level: number;
  shape: string | null;
  minMoves: number;
  searchCost: number;
}

/** 격자로 옮기는 과정에서 생긴 1~2칸짜리 티끌 덩어리는 화살로 만들 수 없으니 뺀다. */
function dropTinyComponents(mask: [number, number][], minCells = 3): [number, number][] {
  const set = new Set(mask.map(([c, r]) => `${c},${r}`));
  const seen = new Set<string>();
  const keep = new Set<string>();
  for (const [c0, r0] of mask) {
    const k0 = `${c0},${r0}`;
    if (seen.has(k0)) continue;
    const comp: string[] = [];
    const q: [number, number][] = [[c0, r0]];
    seen.add(k0);
    while (q.length) {
      const [c, r] = q.pop()!;
      comp.push(`${c},${r}`);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${c + dc},${r + dr}`;
        if (set.has(nk) && !seen.has(nk)) { seen.add(nk); q.push([c + dc, r + dr]); }
      }
    }
    if (comp.length >= minCells) for (const k of comp) keep.add(k);
  }
  return mask.filter(([c, r]) => keep.has(`${c},${r}`));
}

/** 부분 마스크 여러 개 + 나머지로 나눈다. 각 영역에서 1~2칸짜리 낱조각은 나머지 영역으로 넘긴다. */
function splitMulti(
  shape: (typeof SHAPES)[number],
  multi: Multi,
  side: number,
  minCells = 3,
): { regions: { mask: [number, number][]; palette: string[] }[] } {
  const raw = dropTinyComponents(buildMask(shape, side, side), minCells);
  const minC = Math.min(...raw.map(p => p[0])), minR = Math.min(...raw.map(p => p[1]));
  const key = (c: number, r: number) => `${c},${r}`;
  const owner = new Map<string, number>(); // -1 = 나머지
  const partSets = multi.parts.map(p => new Set(buildMask(shapeFromGrid(p.key as never, 0), side, side).map(([c, r]) => key(c, r))));
  for (const [c, r] of raw) {
    const idx = partSets.findIndex(ps => ps.has(key(c, r)));
    owner.set(key(c, r), idx);
  }
  // 영역별 낱조각(3칸 미만)은 나머지로 보낸다
  for (let idx = 0; idx < multi.parts.length; idx++) {
    const cells = raw.filter(([c, r]) => owner.get(key(c, r)) === idx);
    const kept = new Set(dropTinyComponents(cells).map(([c, r]) => key(c, r)));
    for (const [c, r] of cells) if (!kept.has(key(c, r))) owner.set(key(c, r), -1);
  }
  // 나머지 영역에도 경계에서 생긴 1~2칸짜리 낱조각이 남을 수 있다. 화살로 자를 수 없으니 이웃한 부분 영역으로 합친다.
  {
    const rest = raw.filter(([c, r]) => owner.get(key(c, r)) === -1);
    const restSet = new Set(rest.map(([c, r]) => key(c, r)));
    const seen = new Set<string>();
    for (const [c0, r0] of rest) {
      const k0 = key(c0, r0);
      if (seen.has(k0)) continue;
      const comp: [number, number][] = [];
      const q: [number, number][] = [[c0, r0]];
      seen.add(k0);
      while (q.length) {
        const [c, r] = q.pop()!;
        comp.push([c, r]);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nk = key(c + dc, r + dr);
          if (restSet.has(nk) && !seen.has(nk)) { seen.add(nk); q.push([c + dc, r + dr]); }
        }
      }
      if (comp.length >= 3) continue;
      // 이웃 칸 중 부분 영역에 속한 칸의 영역으로 합친다(없으면 그대로 둔다)
      const votes = new Map<number, number>();
      for (const [c, r] of comp) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const o = owner.get(key(c + dc, r + dr));
        if (o !== undefined && o >= 0) votes.set(o, (votes.get(o) ?? 0) + 1);
      }
      const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
      if (best) for (const [c, r] of comp) owner.set(key(c, r), best[0]);
    }
  }
  const regions = multi.parts.map((p, idx) => ({
    mask: raw.filter(([c, r]) => owner.get(key(c, r)) === idx).map(([c, r]) => [c - minC, r - minR] as [number, number]),
    palette: p.palette,
  }));
  regions.push({
    mask: raw.filter(([c, r]) => owner.get(key(c, r)) === -1).map(([c, r]) => [c - minC, r - minR] as [number, number]),
    palette: multi.restPalette,
  });
  return { regions };
}

/** 모양을 부분 마스크와 나머지로 나누고, 각 영역이 한 덩어리가 되도록 경계의 낱칸을 큰 쪽으로 넘긴다. */
function splitRegions(
  shape: (typeof SHAPES)[number],
  split: Split,
  side: number,
): { part: [number, number][]; rest: [number, number][] } {
  const raw = buildMask(shape, side, side);
  const minC = Math.min(...raw.map(p => p[0])), minR = Math.min(...raw.map(p => p[1]));
  const partShape = shapeFromGrid(split.partKey as never, 0);
  const partRaw = new Set(buildMask(partShape, side, side).map(([c, r]) => `${c},${r}`));
  const key = (c: number, r: number) => `${c},${r}`;
  const inPart = new Map<string, boolean>(raw.map(([c, r]) => [key(c, r), partRaw.has(key(c, r))]));

  const components = (want: boolean): string[][] => {
    const seen = new Set<string>();
    const out: string[][] = [];
    for (const [k, v] of inPart) {
      if (v !== want || seen.has(k)) continue;
      const comp: string[] = [];
      const queue = [k];
      seen.add(k);
      while (queue.length) {
        const cur = queue.pop()!;
        comp.push(cur);
        const [c, r] = cur.split(',').map(Number);
        for (const nk of [key(c + 1, r), key(c - 1, r), key(c, r + 1), key(c, r - 1)]) {
          if (inPart.get(nk) === want && !seen.has(nk)) { seen.add(nk); queue.push(nk); }
        }
      }
      out.push(comp);
    }
    return out;
  };
  // 각 영역에서 가장 큰 덩어리만 남기고 나머지 낱조각은 반대 영역으로 넘긴다(몇 번 반복하면 안정된다).
  for (let iter = 0; iter < 4; iter++) {
    for (const want of [true, false]) {
      const comps = components(want).sort((a, b) => b.length - a.length);
      const drop = split.minComponent === undefined
        ? comps.slice(1)
        : comps.filter(c => c.length < split.minComponent!);
      for (const c of drop) for (const k of c) inPart.set(k, !want);
    }
  }
  const part: [number, number][] = [];
  const rest: [number, number][] = [];
  for (const [c, r] of raw) (inPart.get(key(c, r)) ? part : rest).push([c - minC, r - minR]);
  return { part, rest };
}

const stages: Stage[] = JSON.parse(readFileSync(STAGES_PATH, 'utf-8'));
const slotLevels = new Set(SLOTS.map(s => s.level));
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map(Number)) : null;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** 곡선 위 기준값 — 모양·하이라이트(5, 15, 25...)·이번에 교체할 자리를 뺀 이웃들의 중앙값. */
function trendAt(level: number): number {
  const neighbors = stages.filter(s =>
    Math.abs(s.level - level) <= 6 &&
    !s.shape && s.level % 10 !== 5 && !slotLevels.has(s.level) && s.level !== level,
  );
  return median(neighbors.map(s => s.searchCost));
}

for (const slot of SLOTS) {
  if (only && !only.has(slot.level)) continue;
  const shape = SHAPES.find(s => s.name === slot.shape);
  if (!shape) { console.error(`모양 '${slot.shape}' 없음`); process.exit(1); }
  const target = trendAt(slot.level) * (slot.mult ?? SHAPE_MULT);

  const cands: { lv: LevelData; rough: number }[] = [];
  for (const side of slot.sides ?? SIDES) {
    const fitted = fitMask(buildMask(shape, side, side));
    const { cols, rows } = fitted;
    const mask = dropTinyComponents(fitted.mask);
    const parts = slot.split ? splitRegions(shape, slot.split, side) : null;
    const multiParts = slot.multi ? splitMulti(shape, slot.multi, side, slot.minCells ?? 3) : null;
    for (const n of slot.counts ?? PIECE_COUNTS) {
      for (let k = 0; k < PER_COMBO; k++) {
        const lv = multiParts
          ? generateRegionedLevel(
              multiParts.regions.map(rg => ({
                mask: rg.mask,
                // 영역 크기에 비례해 나누되, 아주 작은 영역(심지 같은)도 최소 1개, 칸수/3 을 넘지 않게 한다
                numPieces: Math.max(1, Math.min(Math.floor(rg.mask.length / 3), Math.round(n * rg.mask.length / mask.length))),
                palette: rg.palette,
              })),
              cols, rows, 0.35)
          : parts
          ? generateRegionedLevel([
              { mask: parts.part, numPieces: Math.max(3, Math.round(n * parts.part.length / mask.length)), palette: slot.split!.partPalette },
              { mask: parts.rest, numPieces: Math.max(3, Math.round(n * parts.rest.length / mask.length)), palette: slot.split!.restPalette },
            ], cols, rows, 0.35)
          : generateShapedLevel(mask, cols, rows, n, 0.35, slot.palette);
        if (!lv) continue;
        const rough = measure(lv, 3);
        if (rough === null || rough <= 0) continue;
        cands.push({ lv, rough });
      }
    }
  }
  if (!cands.length) { console.error(`L${slot.level} ${slot.shape}: 후보 없음`); process.exit(1); }

  cands.sort((a, b) => Math.abs(Math.log(a.rough / target)) - Math.abs(Math.log(b.rough / target)));
  let best: { lv: LevelData; cost: number } | null = null;
  for (const c of cands.slice(0, SHORTLIST)) {
    const cost = measure(c.lv, 12);
    if (cost === null || cost <= 0) continue;
    if (!best || Math.abs(Math.log(cost / target)) < Math.abs(Math.log(best.cost / target))) best = { lv: c.lv, cost };
  }
  if (!best) { console.error(`L${slot.level} ${slot.shape}: 정밀 측정 실패`); process.exit(1); }

  stages[slot.level - 1] = {
    level: slot.level,
    ...best.lv,
    shape: slot.shape,
    minMoves: best.lv.pieces.length,
    searchCost: Math.round(best.cost * 10) / 10,
  };
  console.log(
    `L${String(slot.level).padStart(2)} ${slot.shape.padEnd(6)} ${best.lv.gridCols}x${best.lv.gridRows} ` +
    `${String(best.lv.pieces.length).padStart(3)}피스  비용 ${best.cost.toFixed(1).padStart(6)}  (목표 ${target.toFixed(1)})`,
  );
}

writeFileSync(STAGES_PATH, JSON.stringify(stages) + '\n');
console.log(`저장 → ${STAGES_PATH}`);

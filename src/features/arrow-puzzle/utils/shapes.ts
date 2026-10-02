/**
 * 모양(실루엣) 스테이지에 쓰는 마스크 정의.
 *
 * 새 모양을 추가하려면 SHAPES 에 한 줄 넣으면 된다.
 * 판정 함수는 정규화 좌표를 받는다 — 가운데가 (0,0), 가장자리가 ±1, y 는 아래가 양수.
 * 반환값이 true 인 칸만 판에 포함된다.
 *
 * 자동차/고래처럼 수식으로 표현하기 어려운 복잡한 실루엣은 이모지를 헤드리스 브라우저로
 * 래스터라이즈해 만든 기준 해상도 마스크(emoji-masks.json)를 shapeFromGrid 로 감싸 쓴다.
 * (scripts/render-emoji-mask.mjs 로 생성)
 *
 * 추가한 뒤에는 반드시 미리보기로 실루엣을 확인할 것:
 *   npx tsx scripts/preview-arrow-shapes.ts
 */
import emojiMasks from '../data/emoji-masks.json';

export type Mask = [number, number][];

export interface MaskShape {
  name: string;
  /** 정규화 좌표 (x, y ∈ [-1, 1]) 에서 이 칸이 모양 안쪽인지 */
  inside: (x: number, y: number) => boolean;
  /**
   * 이 크기 미만의 판에서는 쓰지 않는다.
   * 칸이 적으면 복잡한 실루엣은 뭉개져서 뭘 그린 건지 알아볼 수 없다.
   */
  minSide?: number;
}

/**
 * 꼭짓점이 뾰족한 n각별. 위쪽이 꼭짓점이고, innerRatio 는 오목한 꼭짓점(골)이 중심에서 떨어진 비율이다
 * (정오각별은 약 0.38 — 조금 통통하게 잡아야 격자에서 가지가 또렷하게 남는다).
 * 각 가지를 한 변으로 보고, 꼭짓점→골을 잇는 직선의 안쪽인지로 판정한다.
 */
function starShape(name: string, points: number, innerRatio: number, minSide: number): MaskShape {
  const sector = (2 * Math.PI) / points;
  const half = sector / 2;
  // 가지 하나를 꼭짓점이 x축 위에 오도록 눕혀서 본다: 꼭짓점 A=(1,0), 골 B=(inner·cos h, inner·sin h)
  const ax = 1, ay = 0;
  const bx = innerRatio * Math.cos(half), by = innerRatio * Math.sin(half);
  const ex = bx - ax, ey = by - ay;
  const originSide = Math.sign(ex * (0 - ay) - ey * (0 - ax)); // 원점이 있는 쪽 = 안쪽
  return {
    name,
    minSide,
    inside: (x, y) => {
      const r = Math.hypot(x, y);
      if (r === 0) return true;
      const a = Math.atan2(x, -y); // 위쪽이 0 — 첫 꼭짓점 방향
      // 가장 가까운 꼭짓점 방향에서 벗어난 각도(0 = 꼭짓점 정면, half = 골 정면)
      const d = Math.abs((((a + half) % sector) + sector) % sector - half);
      const px = r * Math.cos(d), py = r * Math.sin(d);
      const side = Math.sign(ex * (py - ay) - ey * (px - ax));
      return side === originSide || side === 0;
    },
  };
}

/**
 * 손으로 그린 개구리(정면, 앉은 자세). 원본 도트 그림에서 뽑은 실루엣은 안쪽 무늬가 뭉개져 알아보기 어려워,
 * 도형을 조합해 직접 그렸다. 좌표는 정규화 좌표(가운데 (0,0), 아래가 +y).
 *  - 몸: 머리(가로로 넓은 타원)와 배(타원), 위쪽의 툭 튀어나온 두 눈 돌기(눈동자는 구멍)
 *  - 얼굴: 크게 웃는 입(곡선 틈)
 *  - 다리: 옆으로 벌린 뒷다리(허벅지와 몸통 사이 틈)와 발가락 톱니, 앞다리
 */
function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}
/** 타원 테두리 폭(정규화 거리)만큼의 띠 — 몸통 안에 틈(선)을 낼 때 쓴다. */
function onEllipseRing(x: number, y: number, cx: number, cy: number, rx: number, ry: number, w: number): boolean {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  const d = Math.sqrt(dx * dx + dy * dy);
  return Math.abs(d - 1) * Math.min(rx, ry) <= w;
}
function frogDrawing(x: number, y: number): boolean {
  const ax = Math.abs(x); // 좌우 대칭이라 오른쪽 기준으로만 판정한다
  // 채워지는 부분
  const head = inEllipse(ax, y, 0, -0.2, 0.78, 0.46);
  const eyeBump = inEllipse(ax, y, 0.48, -0.62, 0.27, 0.26);
  const belly = inEllipse(ax, y, 0, 0.3, 0.52, 0.52);
  const thigh = inEllipse(ax, y, 0.66, 0.5, 0.3, 0.4);
  const foot = inEllipse(ax, y, 0.74, 0.9, 0.26, 0.1);
  const frontLeg = inEllipse(ax, y, 0.26, 0.8, 0.13, 0.2);
  const frontFoot = inEllipse(ax, y, 0.3, 0.98, 0.19, 0.07);
  const filled = head || eyeBump || belly || thigh || foot || frontLeg || frontFoot;
  if (!filled) return false;
  // 파내는 부분
  const pupil = inEllipse(ax, y, 0.48, -0.6, 0.11, 0.12);
  // 크게 웃는 입: 중심 (0,-0.46) 반지름 0.56 원의 아래쪽 호
  const mouthR = Math.hypot(ax, y + 0.46);
  const mouth = y > -0.4 && ax < 0.56 && Math.abs(mouthR - 0.56) <= 0.034;
  // 허벅지와 몸통 사이 틈 — 허벅지 타원 테두리 중 몸통(안쪽) 쪽 절반
  const thighGap = ax < 0.62 && y > 0.12 && onEllipseRing(ax, y, 0.66, 0.5, 0.3, 0.4, 0.034);
  // 앞다리와 배 사이 틈
  const frontGap = y < 0.7 && onEllipseRing(ax, y, 0.26, 0.8, 0.13, 0.2, 0.028);
  return !(pupil || mouth || thighGap || frontGap);
}

/**
 * 손으로 그린 네잎클로버. 원본 도트 그림의 실루엣은 네 장의 잎이 한 덩어리로 뭉쳐 알아보기 어려워,
 * 하트 모양 잎 네 장을 대각선 방향으로 꼭짓점이 가운데로 모이게 놓고 아래로 휘는 줄기를 붙였다.
 * 각 잎은 표준 하트 곡선 (X²+Y²−1)³ − X²Y³ ≤ 0 (꼭짓점 Y=-1, 윗 둥근 부분 Y≈1.25)을 잎 방향으로 눕혀서 쓴다.
 */
function cloverLeaf(x: number, y: number, dx: number, dy: number): boolean {
  const r0 = -0.07, r1 = 0.8, halfW = 0.35;       // 꼭짓점~잎 끝 거리, 잎 반폭
  const v = x * dx + y * dy;                      // 잎 방향(가운데 → 바깥)으로의 거리
  const u = x * -dy + y * dx;                     // 잎 방향에 수직인 거리
  if (v < r0 - 0.02 || v > r1 + 0.02) return false;
  const Y = ((v - r0) / (r1 - r0)) * 2.25 - 1;
  const X = (u / halfW) * 1.14;
  const t = X * X + Y * Y - 1;
  return t * t * t - X * X * Y * Y * Y <= 0;
}
function cloverDrawing(x: number, y: number): boolean {
  const k = Math.SQRT1_2;
  const leaves = cloverLeaf(x, y, -k, -k) || cloverLeaf(x, y, k, -k) || cloverLeaf(x, y, -k, k) || cloverLeaf(x, y, k, k);
  // 줄기: 가운데 아래에서 시작해 오른쪽 아래로 살짝 휘는 얇은 띠
  const t = (y - 0.05) / 0.9;                     // 0..1 (위 → 아래)
  const stem = t >= 0 && t <= 1 && Math.abs(x - (0.04 + 0.16 * t * t)) <= 0.075 && y > 0.3;
  return leaves || stem;
}

export const SHAPES: MaskShape[] = [
  { name: '네잎클로버', inside: cloverDrawing, minSide: 26 },
  { name: '개구리 그림', inside: frogDrawing, minSide: 28 },
  { name: '원', inside: (x, y) => Math.hypot(x, y) <= 1 },
  starShape('오각별', 5, 0.46, 16),
  { name: '마름모', inside: (x, y) => Math.abs(x) + Math.abs(y) <= 1 },
  { name: '십자', inside: (x, y) => Math.abs(x) <= 0.38 || Math.abs(y) <= 0.38 },
  { name: '모래시계', inside: (x, y) => Math.abs(x) <= 0.25 + 0.75 * Math.abs(y) },
  { name: '나비', inside: (x, y) => Math.abs(y) <= 0.25 + 0.75 * Math.abs(x) },
  // 도넛 — 고리보다 구멍이 작고 몸통이 두툼하다(구멍 반지름 0.36). 구멍이 너무 작으면 격자에서 메워지므로 minSide 를 둔다.
  { name: '도넛', inside: (x, y) => { const d = Math.hypot(x, y); return d <= 1 && d >= 0.36; }, minSide: 16 },
  { name: '고리', inside: (x, y) => { const d = Math.hypot(x, y); return d <= 1 && d >= 0.42; }, minSide: 12 },
  {
    name: '별',
    inside: (x, y) => Math.hypot(x, y) <= 0.55 + 0.45 * Math.abs(Math.cos(2.5 * Math.atan2(y, x))),
    minSide: 12,
  },
  {
    // 표준 하트 곡선 (X²+Y²−1)³ − X²Y³ ≤ 0. X∈[-1.14,1.14], Y∈[-1,1.25] 범위를 정규화 좌표 ±1 에 딱 맞춘다.
    // 위쪽 가운데가 움푹 파이고 아래는 뾰족한 끝이 남는다.
    name: '하트',
    inside: (x, y) => {
      const X = x * 1.14;
      const Y = -y * 1.125 + 0.125; // y 는 아래가 양수 → 위가 양수인 곡선 좌표로 뒤집는다
      const t = X * X + Y * Y - 1;
      return t * t * t - X * X * Y * Y * Y <= 0;
    },
    minSide: 12,
  },
  {
    name: '삼각형',
    inside: (x, y) => y >= -0.85 && y <= 0.85 && Math.abs(x) <= (y + 0.85) * 0.62,
    minSide: 10,
  },
  {
    name: '초승달',
    inside: (x, y) => Math.hypot(x, y) <= 0.95 && Math.hypot(x - 0.42, y) > 0.78,
    minSide: 12,
  },
  {
    name: '물방울',
    inside: (x, y) => {
      const yy = y * 0.95;
      // 아래는 둥글고 위로 갈수록 뾰족해진다
      return Math.hypot(x, yy - 0.28) <= 0.62 || (yy < 0.28 && Math.abs(x) <= 0.62 * (yy + 0.85) / 1.13);
    },
    minSide: 12,
  },
  shapeFromGrid('car', 14),
  shapeFromGrid('whale', 18),
  shapeFromGrid('cat', 16),
  shapeFromGrid('tree', 14),
  shapeFromGrid('rocket', 14),
  shapeFromGrid('fish', 14),
  // public/images/nonogram/card/umbrella.png 의 알파 채널을 140x140으로 리샘플링해 만든 마스크.
  // 이모지가 아니라 임의 PNG를 쓴 첫 사례 — render-emoji-mask.mjs 의 이모지 캔버스 대신
  // PIL로 직접 리사이즈 + 알파 스레숄드(0.35) 했을 뿐, emoji-masks.json 포맷은 동일하다.
  shapeFromGrid('umbrella', 16),
  // public/images/nonogram/animals/{cat,corgi,rabbit}.png — 픽셀아트 캐릭터. 알파가 없는 PNG 라서
  // 가장자리에서 배경색(245,249,255)을 flood fill 해 바깥을 지우고, 250x250 정사각 캔버스에
  // 가운데 정렬해 알파 스레숄드(0.35)로 만들었다. 귀·꼬리처럼 가는 부분이 보이도록 minSide 를 넉넉히 둔다.
  shapeFromGrid('catPixel', 26),
  shapeFromGrid('corgi', 26),
  shapeFromGrid('rabbit', 26),
  // public/images/arrow-puzzle/animals.png — 3x3 스프라이트 시트(알파 있는 흑백 픽셀아트).
  // 알파 128 이상을 연결 성분으로 나눠 타일별로 묶고(판다의 대나무, 부엉이 눈처럼 떨어진 조각 포함),
  // 250x250 정사각 캔버스에 가운데 정렬해 0.35 스레숄드로 만들었다. 스테이지 10~90 에 직접 배치한다
  // (scripts/apply-arrow-animal-stages.ts). 판 크기 상한(20)보다 커서 무작위 추첨 후보에는 들어가지 않는다.
  shapeFromGrid('a_dog', 24),
  shapeFromGrid('a_cat', 24),
  shapeFromGrid('a_rabbit', 24),
  shapeFromGrid('a_panda', 24),
  shapeFromGrid('a_penguin', 24),
  shapeFromGrid('a_fox', 24),
  shapeFromGrid('a_squirrel', 24),
  shapeFromGrid('a_hedgehog', 24),
  shapeFromGrid('a_owl', 24),
  // 체리 — 사용자가 준 픽셀아트 PNG(흰 배경, 4~13px 어두운 스크린샷 프레임)에서 프레임을 잘라내고 가장자리에서
  // 흰색을 flood fill 해 바깥을 지운 실루엣(하이라이트의 흰 점은 빨강에 둘러싸여 남는다). 줄기가 가늘어
  // 작은 판에서는 끊기므로 minSide 를 넉넉히 둔다.
  shapeFromGrid('cherry', 24),
  // 피자 조각 — 사용자가 준 픽셀아트 PNG(흰 배경, 위·오른쪽 3px 어두운 스크린샷 프레임). 프레임을 잘라내고
  // 가장자리에서 흰색을 flood fill 해 바깥을 지운 실루엣. 페퍼로니 같은 안쪽 무늬는 전부 채워진다.
  shapeFromGrid('pizza', 20),
  // 딸기 — 사용자가 준 픽셀아트 PNG(흰 배경, 아래 3px 스크린샷 프레임). 잎과 열매 사이에 흰 틈이 있어
  // 두 덩어리로 나뉜 실루엣이다(strawberry_leaf 가 잎 부분). 잎 끝이 가늘어 작은 판에서는 뭉개지므로 minSide 를 둔다.
  shapeFromGrid('strawberry', 24),
  // 스시(연어초밥) — 사용자가 준 픽셀아트 PNG(흰 배경). 가장자리에서 흰색을 flood fill 해 바깥을 지우면 검은 윤곽선
  // 안쪽의 흰 밥은 그대로 남는다. sushi_fish 는 주황색 회 부분(+그 둘레 윤곽선)이라 회/밥을 영역으로 나눌 수 있다.
  shapeFromGrid('sushi', 22),
  // 닻 — 사용자가 준 검은 실루엣 PNG. 어두운 픽셀(밝기 128 미만)을 그대로 실루엣으로 삼았다. 위쪽 고리 안의
  // 작은 구멍은 채우지 않고 남기고, 하단 갈고리 끝이 가늘어 작은 판에서는 뭉개지므로 minSide 를 둔다.
  shapeFromGrid('anchor', 24),
  // 왕관 — 사용자가 준 검은 선 왕관 PNG. 어두운 픽셀을 실루엣으로 삼고 테두리 안쪽 빈 공간을 채운 꽉 찬 왕관이다.
  // 아래의 받침 막대는 왕관과 떨어진 별도 덩어리로 함께 남긴다.
  shapeFromGrid('crown', 26),
  // 물고기 — 사용자가 준 굵은 선 물고기 아이콘 PNG. 선(윤곽·아가미·눈)의 안쪽 빈 공간을 채운 꽉 찬 실루엣이고,
  // fish_pix_line 이 선 부분이라 "선 영역 / 채워진 안쪽 면 영역"으로 나눠 아이콘의 무늬를 화살로 살릴 수 있다.
  shapeFromGrid('fish_pix', 26),
  // 해골 — 사용자가 준 가는 선 해골 아이콘 PNG. 선이 너무 가늘어(약 6px) 그대로는 격자에서 사라지므로 머리뼈와 턱을
  // 채운 실루엣으로 만들고, 눈·코 링의 안쪽 흰 공간만 구멍으로 남겼다. 턱은 머리뼈와 떨어진 별도 덩어리다.
  shapeFromGrid('skull', 22),
  // 개구리 — 사용자가 준 흑백 픽셀아트 PNG. 배경이 투명이 아니라 회색/흰색 체크무늬로 구워져 있어, 검은 윤곽선의
  // 안쪽을 채운 실루엣을 썼다(눈·웃는 입·콧구멍 같은 안쪽 무늬는 모두 채워진다).
  shapeFromGrid('frog', 22),
  // 개구리(표정) — 위 개구리 실루엣에서 안쪽의 굵은 검은 무늬(눈동자·입·다리와 몸통 사이 선)를 빈 칸으로 파낸 것.
  // 화살은 색을 구분하지 않는 Mono 컨셉에서도 파낸 틈을 따라 배치되므로, 화살의 배치만으로 눈·입·다리가 읽힌다.
  shapeFromGrid('frog_face', 30),
  // 폭탄 — 사용자가 준 픽셀아트 PNG(위쪽 가장자리에 걸친 다른 그림 조각은 제외). 몸통(어두운 회색)·심지(갈색)·불꽃(빨강/주황/노랑)을
  // 색으로 분류해 bomb_spark, bomb_fuse 를 부분 마스크로 저장했다. 나머지가 몸통이라 영역별로 화살 색을 달리 줄 수 있다.
  shapeFromGrid('bomb', 26),
  // 트로피 — 사용자가 준 픽셀아트 PNG(배경에 번진 얼룩이 있어 흰색 대신 그림의 색으로 분류). 금색 컵·손잡이·윤곽이 기본이고,
  // trophy_star(컵 가운데 별)·trophy_base(받침의 갈색)를 부분 마스크로 저장했다. 손잡이 안쪽의 큰 빈 공간은 구멍으로 남는다.
  shapeFromGrid('trophy', 26),
  // 바나나 — 사용자가 준 픽셀아트 PNG(아래쪽에 번진 분홍 얼룩과 잘린 가장자리는 색으로 걸러냄). 껍질(노랑)·윤곽이 기본이고
  // banana_fruit(벗겨진 크림색 속살)을 부분 마스크로 저장했다. 껍질이 말려 생긴 큰 틈은 구멍으로 남는다.
  shapeFromGrid('banana', 26),
  // 음표 — 사용자가 준 흑백 픽셀아트 PNG(회색으로 번진 배경). 검은 윤곽선의 안쪽 흰 면을 채운 실루엣이고 양옆의 반짝이는 별
  // 두 개는 음표와 떨어진 별도 덩어리다. note_line 이 검은 윤곽 부분이라 "윤곽 / 흰 면" 두 영역으로 나눌 수 있다.
  shapeFromGrid('note', 24),
  // 케이크(딸기 생크림 조각) — 사용자가 준 픽셀아트 PNG. 배경이 투명이 아니라 회색/흰색 체크무늬로 구워져 있어, 검은 윤곽선의
  // 안쪽을 채운 실루엣을 썼다. 안쪽은 색으로 분류해 cake_leaf(딸기 잎 초록), cake_red(딸기·잼 빨강), cake_cream(흰 크림)을
  // 부분 마스크로 저장했고 나머지(스펀지 노랑·윤곽)가 기본 영역이다.
  shapeFromGrid('cake', 24),
  // 다이아몬드 — 사용자가 준 픽셀아트 PNG. 배경이 투명이 아니라 회색/흰색 체크무늬로 구워져 있어 검은 윤곽선의 안쪽을 채운
  // 실루엣을 썼다. 면은 색조로 나눠 diamond_light(흰색·연한 하늘색), diamond_deep(짙은 파랑)을 부분 마스크로 저장했고
  // 나머지(밝은 파랑·윤곽)가 기본 영역이다.
  shapeFromGrid('diamond', 24),
  // 알람시계 — 사용자가 준 픽셀아트 PNG. 빨간 몸통·종·금색 꼭지와 발을 합쳐 안쪽을 채운 실루엣이고, 시계 얼굴 안의
  // 검은 바늘과 눈금은 빈 칸으로 파냈다(그래서 화살 배치만으로 시각이 읽힌다). clock_face(크림색 얼굴), clock_gold(금색 부분)는
  // 부분 마스크이고 나머지(빨강·윤곽)가 기본 영역이다.
  shapeFromGrid('clock', 24),
  // 종(벨) — 사용자가 준 픽셀아트 PNG(뒤에 번진 파스텔 배경은 색으로 걸러냄). 금색 종·고리·윤곽이 기본이고 bell_bow(빨간 리본),
  // bell_inside(종 입구 안쪽의 진한 갈색)를 부분 마스크로 저장했다.
  shapeFromGrid('bell', 24),
  // 마법사 모자 — 사용자가 준 픽셀아트 PNG. 모자 옆에 떠 있는 반짝이는 별 세 개는 제외하고(떨어진 덩어리), 뒤에 번진 배경도
  // 색으로 걸러냈다. 보라색 모자가 기본이고 wizard_star(띠 위의 노란 별), wizard_band(주황 띠)를 부분 마스크로 저장했다.
  shapeFromGrid('wizard_hat', 24),
  // 귀여운 고래(일러스트) — 사용자가 준 PNG. 파란 몸통·남색 윤곽·물줄기를 색으로 골라내 안쪽을 채운 실루엣이고(뒤에 번진 배경과
  // 가장자리에 걸린 초록 그림 조각은 제외), 눈은 빈 칸으로 팠다. whale_cute_belly 는 흰 배 부분을 부분 마스크로 저장했다.
  shapeFromGrid('whale_cute', 24),
  // 거북이(일러스트) — 사용자가 준 PNG. 굵은 검은 윤곽선의 안쪽을 채운 실루엣이다(뒤에 번진 배경은 제외).
  // 청록 몸통·지느러미가 기본이고 turtle_shell(주황 갈색 등껍질), turtle_cream(연한 크림색 얼굴·배)을 부분 마스크로 저장했다.
  shapeFromGrid('turtle', 24),
  // 해바라기(일러스트) — 사용자가 준 PNG. 노랑·주황 꽃잎, 갈색 씨앗판, 초록 잎, 검은 윤곽을 합친 덩어리의 안쪽을 채운 실루엣이고
  // (왼쪽 가장자리에 걸린 파란 그림 조각과 뒤에 번진 배경은 제외), sunflower_leaf(잎), sunflower_disc(씨앗판)를 부분 마스크로 저장했다.
  shapeFromGrid('sunflower', 24),
  // 아기 공룡(일러스트) — 사용자가 준 PNG. 굵은 검은 윤곽선의 안쪽을 채운 실루엣이고(뒤에 번진 배경은 제외), dragon_orange(주황 날개·등 뿔),
  // dragon_cream(크림색 배·뿔·발톱)을 부분 마스크로 저장했다. 초록 몸통이 기본 영역이다.
  shapeFromGrid('dragon', 24),
  // 화려한 왕관(일러스트) — 사용자가 준 PNG. 금색 틀·빨간 벨벳·파란 보석·윤곽을 합친 덩어리의 안쪽을 채운 실루엣이고(뒤에 번진
  // 배경은 제외), royal_crown_red(빨간 벨벳), royal_crown_blue(파란 보석)를 부분 마스크로 저장했다. 금색이 기본 영역이다.
  // 선으로 그린 왕관 '왕관'(145번)과는 다른 모양이라 이름을 구분했다.
  shapeFromGrid('royal_crown', 24),
  // 선인장(화분) — 사용자가 준 PNG. 윤곽선이 검정이 아니라 어두운 초록이라 초록·주황·분홍·노랑 색을 합친 덩어리의 안쪽을 채운 실루엣이고(뒤에 번진 배경은 제외), cactus_pot(주황 화분),
  // cactus_flower(분홍 꽃)를 부분 마스크로 저장했다. 초록 선인장이 기본 영역이다. 옆으로 튀어나온 노란 가시도 윤곽에 포함된다.
  shapeFromGrid('cactus', 24),
  // 게임패드(일러스트) — 사용자가 준 PNG. 어두운 윤곽선의 안쪽을 채운 실루엣이고(뒤의 흰 배경은 제외), gamepad_buttons(색색의 버튼 네 개),
  // gamepad_dark(십자키·선택 버튼·케이블 같은 어두운 회색 부분)를 부분 마스크로 저장했다. 흰/연보라 몸통이 기본 영역이다.
  shapeFromGrid('gamepad', 24),
  // 우주인(일러스트) — 사용자가 준 PNG. 우주복 밖에 떠 있는 노란 별들은 지웠고(헬멧 유리에 비친 별은 유리 색으로 채워짐),
  // 뒤에 번진 배경도 제외했다. astronaut_visor(짙은 남색 헬멧 유리), astronaut_blue(장갑·부츠·이어패드), astronaut_red(배낭·가슴 패널)를
  // 부분 마스크로 저장했고 흰 우주복이 기본 영역이다.
  shapeFromGrid('astronaut', 24),
  // 야자수 섬(픽셀아트) — 사용자가 준 PNG. 배경이 투명이 아니라 회색/흰색 체크무늬로 구워져 있어, 초록 잎·갈색 줄기·모래·파란 바다·윤곽을
  // 색으로 골라 합친 덩어리의 안쪽을 채운 실루엣을 썼다. palm_island_water(파란 바다), palm_island_trunk(갈색 줄기),
  // palm_island_sand(노란 모래)를 부분 마스크로 저장했고 초록 잎이 기본 영역이다.
  shapeFromGrid('palm_island', 24),
  // 눈사람(픽셀아트) — 사용자가 준 PNG. 배경이 투명이 아니라 회색/흰색 체크무늬로 구워져 있어 윤곽선·빨강·갈색·주황을 합친 덩어리의
  // 안쪽을 채운 실루엣을 썼고, 주위에 떠 있는 눈덩이 세 개는 제외했다. snowman_red(빨간 모자·목도리), snowman_arms(나뭇가지 팔)를
  // 부분 마스크로 저장했고 흰 눈사람이 기본 영역이다.
  shapeFromGrid('snowman', 24),
  // 보물상자(픽셀아트) — 사용자가 준 PNG(뒤에 번진 배경은 검은 윤곽선 안쪽만 채워 제외). 자물쇠의 검은 열쇠 구멍은 빈 칸으로 팠고,
  // chest_gold(금색 띠·자물쇠 테두리)를 부분 마스크로 저장했다. 갈색 나무가 기본 영역이다.
  shapeFromGrid('chest', 24),
  // 앵무새(흑백 픽셀아트) — 사용자가 준 PNG. 배경이 투명이 아니라 회색/흰색 체크무늬로 구워져 있어 검은 윤곽·깃털의 안쪽을 채운 실루엣을
  // 썼다. parrot_dark 가 검은 깃털·부리·눈이라 "검은 부분 / 흰 부분" 두 영역으로 나눠 원본의 흑백 무늬를 살린다.
  shapeFromGrid('parrot', 24),
  // 악어(흑백 픽셀아트) — 사용자가 준 PNG. 배경이 회색/흰색 체크무늬로 구워져 있어 검은 윤곽·비늘의 안쪽을 채운 실루엣을 썼다.
  // croc_dark 가 검은 비늘·눈·윤곽이라 "검은 부분 / 흰 부분(주둥이·배)" 두 영역으로 나눠 흑백 무늬를 살린다.
  shapeFromGrid('croc', 24),
  // UFO(일러스트) — 사용자가 준 PNG. 배경이 회색/흰색 체크무늬로 구워져 있어 윤곽·파랑·주황·하늘색을 합친 덩어리의 안쪽을 채운
  // 실루엣을 썼고, 주위에 떠 있는 별과 구슬은 떨어진 덩어리라서 제외했다. ufo_lights(주황 창), ufo_dome(파란 돔),
  // ufo_beam(하늘색 빛줄기)를 부분 마스크로 저장했고 회색 접시가 기본 영역이다.
  shapeFromGrid('ufo', 24),
  // 카메라(일러스트) — 사용자가 준 PNG. 배경이 회색/흰색 체크무늬로 구워져 있어 어두운 윤곽·보라/파랑·갈색·주황을 합친 덩어리의 안쪽을
  // 채운 실루엣을 썼고, 왼쪽 가장자리에 걸린 보라색 그림 조각은 제외했다. camera_strap(갈색 가죽 끈), camera_glass(보라·파랑 렌즈 유리)를
  // 부분 마스크로 저장했고 은색·회색 본체가 기본 영역이다.
  shapeFromGrid('camera', 24),
  // 달리는 코기(일러스트) — 사용자가 준 PNG(흰 배경에 옅은 그림자). 갈색 윤곽선을 벽으로 두고 바깥 흰 배경을 flood fill 해 지운
  // 실루엣. corgi_run_scarf(빨간 목도리), corgi_run_white(얼굴·배·발·꼬리 끝의 흰 털)를 부분 마스크로 저장했고 주황 털이 기본 영역이다.
  shapeFromGrid('corgi_run', 26),
  // 렌치와 드라이버(일러스트) — 사용자가 준 PNG(흰 배경). 윤곽선을 벽으로 바깥 흰 배경을 flood fill 해 지웠고, 오른쪽 가장자리에
  // 걸린 다른 그림 조각은 제외했다. 렌치 끝의 둥근 구멍은 남겼다. tools_red(빨간 손잡이)를 부분 마스크로 저장했고 은색 금속이 기본 영역이다.
  shapeFromGrid('tools', 26),
  // 전동 드릴(일러스트) — 사용자가 준 PNG(흐린 배경, 왼쪽에 다른 공구 상자가 걸려 있음). 어두운 윤곽선을 벽으로 바깥 배경을 flood fill 해
  // 지우고 가장 큰 덩어리(드릴)만 남겼다. drill_yellow(노란 몸체)를 부분 마스크로 저장했고 검은 고무·회색 금속이 기본 영역이다.
  shapeFromGrid('drill', 28),
  // 비행기(일러스트) — 사용자가 준 PNG(흐린 배경). 어두운 윤곽선을 벽으로 바깥 배경을 flood fill 해 지운 실루엣.
  // plane_blue(파란 날개 끝·꼬리·조종석 유리)를 부분 마스크로 저장했고 흰 동체와 주황 포인트는 기본 영역이다.
  shapeFromGrid('plane', 28),
  // 스쿨버스(일러스트) — 사용자가 준 PNG(흐린 배경). 어두운 윤곽선을 벽으로 바깥 배경을 flood fill 해 지운 실루엣이고, 지붕 위로 붙은
  // 그림자 조각을 없애려고 맨 위 10%를 잘랐다. bus_blue(앞유리·창·헤드라이트), bus_yellow(노란 차체)를 부분 마스크로 저장했고
  // 검은 범퍼·바퀴·거울이 기본 영역이다.
  shapeFromGrid('bus', 26),
  // 헬리콥터(일러스트) — 사용자가 준 PNG(하늘색으로 흐린 배경, 위쪽에 다른 물체가 걸려 있음). 어두운 윤곽선을 벽으로 바깥 배경을
  // flood fill 해 지우고, 윤곽선 안에 갇힌 스키드 사이 배경 조각은 따로 파냈다. heli_blue(조종석 유리·꼬리·무늬), heli_red(빨간 꼬리 날개·무늬)를
  // 부분 마스크로 저장했고 흰 동체와 회색 로터가 기본 영역이다.
  shapeFromGrid('heli', 28),
  // 열기구(일러스트) — 사용자가 준 PNG(흐린 배경, 위쪽에 다른 물체가 걸려 있음). 밝고 채도 낮은 배경을 바깥에서 flood fill 해 지우고
  // 가장 큰 덩어리만 남겼고, 바구니와 밧줄 사이 빈 틈은 파냈다. balloon_red/blue/green/yellow 는 풍선 부분(위쪽 62%)의 색 띠이고,
  // 주황·흰 띠와 바구니·밧줄이 기본 영역이다.
  shapeFromGrid('balloon', 30),
  // 돛단배(일러스트) — 사용자가 준 PNG(색이 번진 흐린 배경, 위·왼쪽에 다른 물체가 걸려 있음). 어두운 윤곽선과 진한 파랑·주황을 벽으로
  // 바깥 배경을 flood fill 해 지우고 가장 큰 덩어리만 남겼다. boat_blue(물결·돛의 파란 띠·깃발), boat_wood(돛대·선체 테두리)를 부분 마스크로
  // 저장했고 흰 돛과 선체가 기본 영역이다.
  shapeFromGrid('boat', 30),
  // 여행 가방(일러스트) — 사용자가 준 PNG(색이 번진 흐린 배경). 어두운 윤곽선과 진한 색을 벽으로 바깥 배경을 flood fill 해 지운 실루엣.
  // suitcase_blue(리본·비행기·스티커의 파랑), suitcase_hat(밀짚모자), suitcase_yellow(노란 가방 몸통)를 부분 마스크로 저장했고
  // 검은 손잡이·바퀴·모서리 보호대가 기본 영역이다.
  shapeFromGrid('suitcase', 30),
  // 골프백(일러스트) — 사용자가 준 PNG(흐린 배경, 위·아래에 다른 물체가 걸려 있음). 어두운 윤곽선을 벽으로 바깥 배경을 flood fill 해
  // 지웠고, 아래쪽에 걸린 당근 조각과 맨 위 14px 은 잘라냈다. 클럽 사이 틈과 가방·공 사이는 메워져 하나의 덩어리다.
  // golf_navy(남색 가방·클럽 머리), golf_grass(잔디), golf_gold(금색 지퍼·띠)를 부분 마스크로 저장했고 흰 가방 면·공이 기본 영역이다.
  shapeFromGrid('golf', 30),
  // 몬스테라 화분(일러스트) — 사용자가 준 PNG(흐린 배경, 아래에 다른 물체가 걸려 있음). 어두운 윤곽선과 진한 초록을 벽으로 바깥 배경을
  // flood fill 해 지우고 가장 큰 덩어리만 남겼다. 잎 사이 칼집은 일부만 남는다. plant_leaf(초록 잎)를 부분 마스크로 저장했고
  // 흰 화분이 기본 영역이다.
  shapeFromGrid('plant', 28),
  // 지구본(일러스트) — 사용자가 준 PNG(색이 번진 흐린 배경, 맨 위에 다른 물체가 걸려 있음). 어두운 윤곽선을 벽으로 바깥 배경을 flood fill 해
  // 지우고 가장 큰 덩어리만 남겼다. globe_land(초록 육지), globe_gold(금색 받침·고리), globe_cloud(흰 구름 + 고리와 지구 사이 틈)를
  // 부분 마스크로 저장했고 파란 바다가 기본 영역이다.
  shapeFromGrid('globe', 30),
  // 잠자는 달(픽셀아트) — 사용자가 준 PNG. 배경이 회색/흰색 체크무늬로 구워져 있어 검은 윤곽선을 벽으로 바깥을 flood fill 해 지웠다.
  // 떨어져 있는 별과 점은 제외했다. moon_dark(윤곽선·감은 눈·입), moon_light(하이라이트), moon_orange(주황 그림자)를 부분 마스크로
  // 저장했고 노란 몸통이 기본 영역이다.
  shapeFromGrid('moon', 28),
  // 팔레트와 붓(일러스트) — 사용자가 준 PNG(흐린 배경). 어두운 윤곽선과 진한 색을 벽으로 바깥 배경을 flood fill 해 지웠고, 팔레트의
  // 엄지 구멍은 남겼다. palette_red/yellow/green/blue(물감 덩어리와 파란 붓대·붓끝)를 부분 마스크로 저장했고 나무색 팔레트·붓털·은색 금속이
  // 기본 영역이다.
  shapeFromGrid('palette', 30),
  // 망원경(일러스트) — 사용자가 준 PNG(흐린 배경, 위·왼쪽에 다른 물체가 걸려 있음). 어두운 윤곽선과 진한 색을 벽으로 바깥 배경을 flood fill 해
  // 지우고 가장 큰 덩어리만 남겼다. scope_lens(파란 렌즈), scope_gold(금색 테·이음매), scope_wood(갈색 다리·받침 그림자)를 부분 마스크로
  // 저장했고 은색·흰색 몸통이 기본 영역이다.
  shapeFromGrid('scope', 30),
  // 요리사 모자(일러스트) — 사용자가 준 PNG(푸른 흐린 배경, 아래에 파란 구슬이 걸려 있음). 어두운 윤곽선과 진한 색을 벽으로 바깥 배경을
  // flood fill 해 지우고 가장 큰 덩어리만 남겼다. chef_scarf(빨간 스카프), chef_steel(포크·뒤집개의 회색 금속), chef_wood(나무 손잡이)를
  // 부분 마스크로 저장했고 흰 모자가 기본 영역이다.
  shapeFromGrid('chef', 30),
  // 로봇(일러스트) — 사용자가 준 PNG(흐린 배경, 위에 빨간 물체가 걸려 있음). 어두운 윤곽선과 진한 색을 벽으로 바깥 배경을 flood fill 해
  // 지우고 가장 큰 덩어리만 남겼다. robot_cyan(하늘색 눈·귀·안테나·빛줄기), robot_dark(검은 화면·관절)를 부분 마스크로 저장했고
  // 흰 몸통이 기본 영역이다. 윤곽선은 얇아서 검은 영역에서 뺐다.
  shapeFromGrid('robot', 28),
  // 물약 병(일러스트) — 사용자가 준 PNG(노랑·파랑으로 번진 흐린 배경). 어두운 윤곽선과 진한 색을 벽으로 바깥 배경을 flood fill 해 지운
  // 실루엣. potion_tan(코르크·끈·보석 테·태그), potion_blue(파란 물약·보석)를 부분 마스크로 저장했고 유리 부분이 기본 영역이다.
  shapeFromGrid('potion', 28),
  // 축음기(일러스트) — 사용자가 준 PNG(흐린 배경, 아래쪽에 다른 물체가 걸려 있음). 어두운 윤곽선과 진한 색을 벽으로 바깥 배경을 flood fill 해
  // 지우고 가장 큰 덩어리만 남겼다. gramo_gold(금색 나팔·명판, 나팔은 위쪽 60%를 통째로), gramo_dark(레코드판·손잡이), gramo_red(레코드 라벨)를
  // 부분 마스크로 저장했고 갈색 나무 상자가 기본 영역이다.
  shapeFromGrid('gramo', 30),
  // 햄버거(일러스트) — 사용자가 준 PNG. 배경이 회색/흰색 체크무늬로 구워져 있어 빵·양상추·토마토·치즈·패티의 색을 합친 덩어리의
  // 안쪽을 채운 실루엣을 썼다. burger_lettuce(초록 양상추), burger_tomato(빨간 토마토·보라 양파), burger_cheese(노란 치즈),
  // burger_patty(갈색 패티)를 부분 마스크로 저장했고 주황색 빵이 기본 영역이다.
  shapeFromGrid('burger', 24),
  // 선물상자(일러스트) — 사용자가 준 PNG. 배경이 회색/흰색 체크무늬로 구워져 있어, 채도가 낮고 밝은 체크무늬 배경만 골라내고 나머지(상자·리본·윤곽)를
  // 실루엣으로 썼다. gift_ribbon(빨간 리본과 나비 매듭)을 부분 마스크로 저장했고 크림색 상자가 기본 영역이다.
  shapeFromGrid('gift', 24),
  // 등불(일러스트) — 사용자가 준 PNG(뒤에 번진 파스텔 배경은 색으로 걸러냄). 청동색 틀·윤곽·빛나는 유리를 합친 덩어리의 안쪽을 채운
  // 실루엣이고, lantern_glow(노랑·주황으로 빛나는 유리 부분)를 부분 마스크로 저장했다. 청동색 틀이 기본 영역이다.
  shapeFromGrid('lantern', 24),
  // 원숭이(흑백 픽셀아트) — 사용자가 준 PNG(흰 배경). 검은 윤곽·털의 안쪽을 채운 실루엣이고, monkey_dark 가 검은 털·눈·윤곽이라
  // "검은 부분 / 흰 부분(얼굴·배·귀 안쪽)" 두 영역으로 나눠 원본의 흑백 무늬를 살린다. 말린 꼬리도 몸에 붙어 있어 함께 들어온다.
  shapeFromGrid('monkey', 24),
  // 기타(굵은 선 아이콘) — 사용자가 준 검은 PNG. 윤곽 안쪽(흰 몸통)을 채운 실루엣이고(왕관 때처럼 속이 비지 않게), guitar_line 이 검은
  // 윤곽·줄받침·사운드홀이라 "윤곽 / 흰 몸통" 두 영역으로 나눠 아이콘의 무늬를 살린다. 오른쪽 위 머리의 작은 흰 구멍도 채워진다.
  shapeFromGrid('guitar', 24),
  // 장난감 자동차(일러스트) — 사용자가 준 PNG(뒤에 번진 파스텔 배경은 색으로 걸러냄). 어두운 윤곽·빨강·파랑·노랑을 합친 덩어리의
  // 안쪽을 채운 실루엣이다. toycar_window(파란 창), toycar_lights(노란 전조등), toycar_gray(회색 바퀴·범퍼)를 부분 마스크로
  // 저장했고 빨간 차체가 기본 영역이다. 기존의 이모지 '자동차'와 구분하려고 이름을 따로 붙였다.
  shapeFromGrid('toycar', 24),
];

/**
 * emoji-masks.json 에 미리 래스터라이즈해 둔 기준 해상도 마스크를,
 * 임의의 격자 크기에서도 판정할 수 있는 inside(x,y) 함수로 감싼다.
 * 세밀한 실루엣이라 작은 격자에서는 뭉개지므로 minSide 를 넉넉히 둔다.
 */
export function shapeFromGrid(key: keyof typeof emojiMasks, minSide: number): MaskShape {
  const { name, refCols, refRows, cells } = emojiMasks[key];
  const set = new Set(cells.map(([c, r]) => `${c},${r}`));
  return {
    name,
    minSide,
    inside: (x, y) => {
      const c = Math.round(x * (refCols / 2) + (refCols - 1) / 2);
      const r = Math.round(y * (refRows / 2) + (refRows - 1) / 2);
      if (c < 0 || c >= refCols || r < 0 || r >= refRows) return false;
      return set.has(`${c},${r}`);
    },
  };
}

/** 정규화 좌표 판정을 격자 칸 목록으로 바꾼다. */
export function buildMask(shape: MaskShape, cols: number, rows: number): Mask {
  const out: Mask = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) / (cols / 2);
      const y = (r - (rows - 1) / 2) / (rows / 2);
      if (shape.inside(x, y)) out.push([c, r]);
    }
  }
  return out;
}

/** 마스크를 바운딩 박스에 맞춰 잘라 격자를 꽉 채운다. */
export function fitMask(mask: Mask): { mask: Mask; cols: number; rows: number } {
  if (mask.length === 0) return { mask, cols: 1, rows: 1 };
  const cs = mask.map(([c]) => c);
  const rs = mask.map(([, r]) => r);
  const minC = Math.min(...cs), maxC = Math.max(...cs);
  const minR = Math.min(...rs), maxR = Math.max(...rs);
  return {
    mask: mask.map(([c, r]) => [c - minC, r - minR] as [number, number]),
    cols: maxC - minC + 1,
    rows: maxR - minR + 1,
  };
}

/**
 * 4-연결 덩어리 개수. 덩어리가 여럿이면 각각 따로 채워지므로 레벨은 만들어지지만,
 * 조각난 실루엣은 대개 의도한 그림이 아니다.
 */
export function componentCount(mask: Mask): number {
  const set = new Set(mask.map(([c, r]) => `${c},${r}`));
  const seen = new Set<string>();
  let n = 0;
  for (const [c0, r0] of mask) {
    const key = `${c0},${r0}`;
    if (seen.has(key)) continue;
    n++;
    const queue: Mask = [[c0, r0]];
    seen.add(key);
    while (queue.length) {
      const [c, r] = queue.pop()!;
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]] as Mask) {
        const nk = `${nc},${nr}`;
        if (set.has(nk) && !seen.has(nk)) { seen.add(nk); queue.push([nc, nr]); }
      }
    }
  }
  return n;
}

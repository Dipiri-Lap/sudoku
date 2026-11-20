/**
 * 아트 에셋 슬롯.
 *
 * 지금은 전부 null이라 코드로 그린 기본 아트가 나간다. 그림을 사 오거나
 * 그려 오면 여기 경로만 채우면 되고 렌더 코드는 건드릴 필요가 없다.
 *
 * 넣는 법: public/assets/3match/ 아래에 두고 경로를 적는다.
 *
 * 라이선스 주의: Unity 에셋 스토어 에셋은 표준 EULA상 Unity 프로젝트 외
 * 사용이 제한될 수 있다. 웹에 쓸 거면 itch.io / CraftPix / Kenney(CC0) 등
 * 웹 허용 라이선스를 확인하고 구매할 것.
 */
export interface ArtAssets {
  /** 화면 전체 배경. 없으면 CSS 그라데이션 */
  background: string | null;
  /** 보드를 감싸는 액자. 9-slice가 아니라 통짜 이미지 기준 */
  boardFrame: string | null;
  /** 칸 바닥 타일 */
  cellPlate: string | null;
  /**
   * 장애물 그림. 없으면 코드로 그린 SVG가 나간다(sprites.tsx).
   * 키는 Blocker.kind 와 같다.
   */
  blockers: Record<string, string | null>;
  /** 정체를 숨긴 장애물 그림. 없으면 코드로 그린 물음표 */
  hiddenBlocker: string | null;
  /**
   * 상단 레이어(보석 위에 얹힘). 키는 Cover.kind, 구름처럼 가리는 덮개는 'cloud'.
   * 가리는 덮개 말고는 가운데가 투명한 그림이어야 아래 보석이 보인다.
   */
  covers: Record<string, string | null>;
  /** 하단 레이어(보석 아래 깔림). 칸을 꽉 채우는 타일. 키는 Ground.kind */
  grounds: Record<string, string | null>;
  /** 그릇(수집물을 받는 칸) */
  collector: string | null;
  /** 수집물(그릇까지 흘려보내는 짐) */
  cargo: string | null;
  /** 투입구(맨 윗줄에서 수집물을 내보내는 관) */
  spawner: string | null;
  /** 붙잡힌 보석(사슬·꿀)에 붙는 "못 옮긴다" 표시 */
  lockIcon: string | null;
  /**
   * 부스터 버튼 아이콘. 키는 BoosterKind.
   * 아이템을 심는 부스터는 판 위 아이템과 같은 그림을 써서 무엇이 나올지 읽히게 한다.
   */
  boosters: Record<string, string | null>;
}

export const ART: ArtAssets = {
  background: null,
  boardFrame: null,
  cellPlate: null,
  // 텃밭 컨셉 장애물. 규칙은 그대로고 그림만 바꿨다(리스킨 축).
  // 원본 시트: generated-images/veggie-blocks/obstacles-{1,2}.png
  blockers: {
    box: blocker('box'), // 짚단
    'crate-heavy': blocker('crate-heavy'), // 나무 상자
    crate: blocker('crate'), // 통나무 (떨어뜨려 빼낸다)
    golem: blocker('golem'), // 두더지
    barrel: blocker('barrel'), // 빗물통
    mailbox: blocker('mailbox'), // 닭장
    mushroom: blocker('mushroom'), // 버섯
    'honey-pot': blocker('honey-pot'), // 벌집
    ice: blocker('ice'), // 돌
    flowerpot: blocker('flowerpot'), // 화분
    bottle: blocker('bottle'), // 유리병
    ghost: blocker('ghost'), // 까마귀
    steel: blocker('steel'), // 쇠 공구함
    bastion: blocker('bastion'), // 이끼 바위
    rubble: blocker('rubble'), // 자갈
    jar: blocker('jar'), // 장독
    cauldron: blocker('cauldron'), // 가마솥
    'magic-hat': blocker('magic-hat'), // 밀짚모자
    'red-lock': blocker('red-lock'), // 토마토 자물쇠 상자 (빨강=토마토 매치로만 열린다)
    // 정체를 숨긴 장애물은 종류와 상관없이 hiddenBlocker 그림이 나간다
    vault: null,
  },
  /** 정체를 숨긴 장애물(hidden). 무엇이 숨었든 같은 그림 - "모른다"가 보여야 한다 */
  hiddenBlocker: blocker('hidden'), // 삼베로 덮은 물음표 꾸러미
  // 원본 시트: generated-images/veggie-blocks/layers-{1,2}.png
  covers: {
    chain: layer('chain'), // 덩굴
    honey: layer('honey'), // 꿀
    'dark-honey': layer('honey'), // 같은 꿀을 CSS로 어둡게
    roof: layer('roof'), // 거미줄
    cloud: layer('cloud'), // 낙엽 더미 (불투명)
  },
  grounds: {
    grass: layer('grass'), // 잡초
    jelly: layer('jelly'), // 꽃밭 (번진다)
    soil: layer('soil'), // 갈아엎은 흙
    marble: layer('marble'), // 디딤돌
    leaf: layer('leaf'), // 낙엽
  },
  collector: layer('basket'),
  cargo: layer('egg'),
  spawner: layer('chute'),
  lockIcon: layer('lock'),
  // 원본 시트: generated-images/veggie-blocks/boosters-sheet.png (망치·섞기)
  boosters: {
    hammer: '/assets/3match/boosters/hammer.png', // 나무 망치
    shuffle: '/assets/3match/boosters/shuffle.png', // 덩굴 순환 화살표
    rocket: '/assets/3match/items/rocket.png', // 삽
    tnt: '/assets/3match/items/tnt.png', // 거름 포대
    propeller: '/assets/3match/items/propeller.png', // 참새
    lightball: '/assets/3match/items/lightball.png', // 무지개 꽃
  },
};

function layer(name: string): string {
  return `/assets/3match/layers/${name}.png`;
}

function blocker(kind: string): string {
  return `/assets/3match/blockers/${kind}.png`;
}

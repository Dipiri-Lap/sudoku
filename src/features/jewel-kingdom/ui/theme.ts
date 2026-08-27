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
}

export const ART: ArtAssets = {
  background: null,
  boardFrame: null,
  cellPlate: null,
  blockers: {
    box: null,
    crate: null,
    golem: null,
    mailbox: null,
    vault: null,
    rubble: null,
  },
};

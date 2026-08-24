import type React from 'react';

// 이펙트 설정. 스프라이트 시트를 사 오면 여기 한 줄만 채우면 CSS 폴백 대신
// 그 시트가 재생된다 - 렌더 코드는 건드릴 필요 없다.
//
// 넣는 법:
//   1) 가로로 프레임이 일렬로 배열된 PNG를 public/effects/ 에 둔다
//      (세로 배열/격자 시트는 미지원 - 가로 한 줄로 뽑아서 쓸 것)
//   2) 아래에 url / frames / durationMs / scale 을 적는다
//   3) 끝. null 이면 CSS로 만든 기본 이펙트가 나간다.
//
// 라이선스 주의: Unity 에셋 스토어 에셋은 표준 EULA상 Unity 프로젝트 외 사용이
// 제한될 수 있다. 웹에 쓸 거면 itch.io / CraftPix / Kenney(CC0) 등 웹 허용
// 라이선스를 확인하고 구매할 것.
export interface SpriteFx {
  /** public/ 기준 절대 경로. 예: '/effects/burst.png' */
  url: string;
  /** 시트에 가로로 들어 있는 프레임 수 */
  frames: number;
  durationMs: number;
  /** 셀 크기 대비 배율. 1이면 한 칸 크기, 2면 칸 두 개 크기로 퍼진다. */
  scale: number;
}

export interface EffectAssets {
  /** 타일이 터질 때 각 칸에서 재생 */
  burst: SpriteFx | null;
  /** 로켓이 만들어질 때 그 칸에서 재생 */
  charge: SpriteFx | null;
}

export const EFFECT_ASSETS: EffectAssets = {
  burst: null,
  charge: null,
};

export function spriteStyle(fx: SpriteFx): React.CSSProperties {
  return {
    backgroundImage: `url('${fx.url}')`,
    backgroundSize: `${fx.frames * 100}% 100%`,
    animationDuration: `${fx.durationMs}ms`,
    animationTimingFunction: `steps(${fx.frames})`,
    ['--fx-frames' as string]: fx.frames,
    ['--fx-scale' as string]: fx.scale,
  };
}

import React, { useEffect, useState } from 'react';

/**
 * 모바일 게임식 화면 배율.
 *
 * 로비·타이틀은 기준 화면(폭 390 × 높이 760, 아이폰 13 안팎) 크기로 배치를 짠다.
 * 실제 화면이 크면 통째로 키우고 작으면 줄인다 - 폰마다 픽셀 값을 따로 맞추지 않아도
 * 숫자가 잘리거나 버튼끼리 겹치지 않는다.
 *  - 배율 = min(화면폭/390, 화면높이/760), 0.72~1.4 사이로 묶는다(태블릿에서 과하게 커지지 않게)
 *  - 무대 크기 = 화면 크기 / 배율 → 배율을 곱하면 화면을 꼭 채운다(옆에 빈 띠가 없다)
 *  - 무대 안의 position:fixed(창, 아래 탭)는 transform 때문에 무대 기준이 되어 함께 커진다
 */
export const DESIGN_W = 390;
export const DESIGN_H = 760;

function measure() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const s = Math.min(1.4, Math.max(0.72, Math.min(w / DESIGN_W, h / DESIGN_H)));
  return { s, w: w / s, h: h / s };
}

export function useStageScale() {
  const [v, setV] = useState(measure);
  useEffect(() => {
    const on = () => setV(measure());
    window.addEventListener('resize', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return v;
}

/** 화면 전체 배경(배율 밖) + 배율을 먹인 무대 */
const ScaledStage: React.FC<
  { className: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>
> = ({ className, children, style, ...rest }) => {
  const { s, w, h } = useStageScale();
  return (
    <div className="pg-viewport">
      <div
        {...rest}
        className={`jk-page pg-stage ${className}`}
        style={{ ...style, width: w, height: h, transform: `scale(${s})` }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaledStage;

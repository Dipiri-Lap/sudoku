import type { CSSProperties } from 'react';

/**
 * 프로필 아바타 테두리. 사용자 문서(users/{uid})의 avatarFrame 에 id 를 저장한다.
 * 값이 없거나 목록에 없는 id 면 기본(노랑)으로 그린다.
 *
 * price 가 없거나 0 이면 무료(기본 색), 있으면 코인으로 해제하는 유료 테두리다.
 * 해제한 id 는 사용자 문서의 unlockedFrames 에 쌓는다.
 * gradient 가 있으면 단색 대신 그라데이션 테두리로 그린다.
 */
export interface AvatarFrame {
    id: string;
    name: string;
    /** 대표 색 — 단색 테두리의 색이거나 그라데이션의 대표 색 */
    color: string;
    gradient?: string;
    /** 테두리 바깥으로 번지는 빛 (box-shadow 값) */
    glow?: string;
    /**
     * 움직이는 테두리. 그라데이션이 흐르고(index.css 의 frameShimmer) 종류별로 빛이 깜빡이거나 숨 쉰다.
     * 쓰는 곳에서 frameClass 를 함께 붙여야 움직인다.
     */
    anim?: FrameAnim;
    /** 테두리 위를 지나가는 빛줄기 레이어(gradient 문자열). anim 이 'ruby' 일 때 쓴다 */
    sweep?: string;
    price?: number;
}

export type FrameAnim =
    | 'shimmer' | 'electric' | 'lava' | 'galaxy'      // 그라데이션이 좌우로 흐르는 종류
    | 'aurorax' | 'ruby' | 'sapphire' | 'toxic'        // 회전·빛줄기·이중 링 종류
    | 'rainbow' | 'phoenix' | 'crown' | 'blackhole';                  // 전설: 무지개 회전·불사조 회전·흐르는 이중 금테

/** 그라데이션을 키워서 흘려 보내지 않는 종류 (conic 회전이나 제자리 빛줄기) */
const STATIC_SIZE_ANIMS: FrameAnim[] = ['aurorax', 'ruby', 'sapphire', 'toxic', 'rainbow', 'phoenix', 'blackhole'];

export const FRAME_PRICE_COMMON = 100;
export const FRAME_PRICE_RARE = 200;
export const FRAME_PRICE_EPIC = 400;
export const FRAME_PRICE_EPIC_PLUS = 600;
export const FRAME_PRICE_LEGEND = 800;

/** 표시 순서는 쓰는 곳에서 가격순으로 정렬하므로 등급 순서대로 적지 않아도 된다 */
export const AVATAR_FRAMES: AvatarFrame[] = [
    { id: 'yellow', name: '노랑', color: '#fde047' },
    { id: 'orange', name: '주황', color: '#fb923c' },
    { id: 'red', name: '빨강', color: '#f87171' },
    { id: 'pink', name: '분홍', color: '#f472b6' },
    { id: 'purple', name: '보라', color: '#a78bfa' },
    { id: 'blue', name: '파랑', color: '#60a5fa' },
    { id: 'green', name: '초록', color: '#4ade80' },
    { id: 'white', name: '하양', color: '#f8fafc' },
    // 유료(일반)
    { id: 'gold', name: '금색', color: '#e6b422', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #fff3b0 0%, #e6b422 45%, #a8740a 100%)' },
    { id: 'silver', name: '은색', color: '#c0c7d0', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #ffffff 0%, #c0c7d0 45%, #7c8796 100%)' },
    { id: 'bronze', name: '동색', color: '#cd7f32', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #f6cfa6 0%, #cd7f32 45%, #8b4a1f 100%)' },
    { id: 'sakura', name: '벚꽃', color: '#f9a8d4', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #fff1f7 0%, #f9a8d4 50%, #f472b6 100%)' },
    { id: 'sunset', name: '노을', color: '#f97316', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #fde047 0%, #fb923c 35%, #ec4899 70%, #7c3aed 100%)' },
    { id: 'aurora', name: '오로라', color: '#2dd4bf', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #5eead4 0%, #38bdf8 35%, #818cf8 70%, #c084fc 100%)' },
    { id: 'ocean', name: '바다', color: '#0ea5e9', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #bae6fd 0%, #38bdf8 40%, #0369a1 100%)' },
    { id: 'forest', name: '숲', color: '#22c55e', price: FRAME_PRICE_COMMON,
        gradient: 'linear-gradient(135deg, #d9f99d 0%, #4ade80 40%, #0f766e 100%)' },
    // 유료(희귀) — 빛 번짐이나 겹침이 더해진다(이중 금테는 정지 상태라 이 등급)
    { id: 'neon', name: '네온', color: '#22d3ee', price: FRAME_PRICE_RARE,
        gradient: 'linear-gradient(135deg, #22d3ee 0%, #818cf8 50%, #e879f9 100%)',
        glow: '0 0 6px rgba(34, 211, 238, 0.9), 0 0 12px rgba(232, 121, 249, 0.6)' },
    { id: 'diamond', name: '다이아', color: '#7dd3fc', price: FRAME_PRICE_RARE,
        gradient: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 20%, #ffffff 40%, #7dd3fc 60%, #e0f2fe 80%, #bae6fd 100%)',
        glow: '0 0 6px rgba(186, 230, 253, 0.8)', anim: 'shimmer' },
    { id: 'flame', name: '불꽃', color: '#f97316', price: FRAME_PRICE_RARE,
        gradient: 'linear-gradient(135deg, #fde047 0%, #fb923c 40%, #ef4444 100%)',
        glow: '0 0 6px rgba(249, 115, 22, 0.9), 0 0 12px rgba(239, 68, 68, 0.55)' },
    { id: 'moonlight', name: '달빛', color: '#c4b5fd', price: FRAME_PRICE_RARE,
        gradient: 'linear-gradient(135deg, #ffffff 0%, #ddd6fe 40%, #a5b4fc 100%)',
        glow: '0 0 6px rgba(221, 214, 254, 0.95), 0 0 12px rgba(165, 180, 252, 0.55)' },
    // 유료(에픽) — 움직임과 빛을 함께 쓴다
    { id: 'electric', name: '전기', color: '#22d3ee', price: FRAME_PRICE_EPIC,
        gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 25%, #ffffff 50%, #22d3ee 75%, #0891b2 100%)',
        glow: '0 0 6px rgba(34, 211, 238, 0.9), 0 0 14px rgba(255, 255, 255, 0.5)', anim: 'electric' },
    { id: 'lava', name: '용암', color: '#ef4444', price: FRAME_PRICE_EPIC,
        gradient: 'linear-gradient(135deg, #fde047 0%, #f97316 25%, #dc2626 50%, #f97316 75%, #fde047 100%)',
        glow: '0 0 6px rgba(239, 68, 68, 0.8), 0 0 12px rgba(249, 115, 22, 0.5)', anim: 'lava' },
    { id: 'galaxy', name: '은하', color: '#a855f7', price: FRAME_PRICE_EPIC,
        gradient: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 25%, #ec4899 50%, #6d28d9 75%, #1e1b4b 100%)',
        glow: '0 0 6px rgba(192, 132, 252, 0.8), 0 0 12px rgba(236, 72, 153, 0.45)', anim: 'galaxy' },
    { id: 'goldtwin', name: '이중 금테', color: '#e6b422', price: FRAME_PRICE_RARE,
        gradient: 'linear-gradient(135deg, #fff3b0 0%, #e6b422 45%, #a8740a 100%)',
        glow: '0 0 0 2px #fff3b0, 0 0 0 4px #b8860b, 0 0 10px rgba(230, 180, 34, 0.6)' },
    // 유료(에픽 상위) — 테두리가 돌거나, 빛줄기가 지나가거나, 두 겹이 엇갈려 돈다
    // conic 의 각도는 CSS 변수 --frame-angle (index.css 의 @property). 미지원 브라우저는 0deg 고정으로 보인다.
    { id: 'aurorax', name: '오로라 회전', color: '#5eead4', price: FRAME_PRICE_EPIC,
        gradient: 'conic-gradient(from var(--frame-angle, 0deg), #5eead4, #38bdf8, #818cf8, #e879f9, #5eead4)',
        glow: '0 0 6px rgba(94, 234, 212, 0.7), 0 0 12px rgba(232, 121, 249, 0.4)', anim: 'aurorax' },
    { id: 'ruby', name: '루비', color: '#dc2626', price: FRAME_PRICE_EPIC_PLUS,
        gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #7f1d1d 100%)',
        sweep: 'linear-gradient(115deg, transparent 43%, rgba(255, 255, 255, 0.95) 50%, transparent 57%)',
        glow: '0 0 6px rgba(220, 38, 38, 0.8), 0 0 12px rgba(127, 29, 29, 0.5)', anim: 'ruby' },
    { id: 'sapphire', name: '사파이어', color: '#3b82f6', price: FRAME_PRICE_EPIC_PLUS,
        gradient: 'conic-gradient(from var(--frame-angle, 0deg), #2563eb, #60a5fa, #dbeafe, #60a5fa, #2563eb)',
        glow: '0 0 6px rgba(59, 130, 246, 0.8), 0 0 12px rgba(125, 211, 252, 0.45)', anim: 'sapphire' },
    { id: 'toxic', name: '독기', color: '#4ade80', price: FRAME_PRICE_EPIC_PLUS,
        gradient: 'conic-gradient(from var(--frame-angle, 0deg), #4ade80, #166534, #a855f7, #581c87, #4ade80)',
        glow: '0 0 6px rgba(74, 222, 128, 0.85), 0 0 12px rgba(168, 85, 247, 0.5)', anim: 'toxic' },
    // 유료(전설) — 가장 화려한 움직임.
    { id: 'rainbow', name: '무지개', color: '#f59e0b', price: FRAME_PRICE_LEGEND,
        gradient: 'conic-gradient(from var(--frame-angle, 0deg), #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)',
        glow: '0 0 7px rgba(239, 68, 68, 0.9), 0 0 14px rgba(239, 68, 68, 0.5)', anim: 'rainbow' },
    { id: 'phoenix', name: '불사조', color: '#f97316', price: FRAME_PRICE_LEGEND,
        gradient: 'conic-gradient(from var(--frame-angle, 0deg), #fde047, #f97316, #dc2626, #f97316, #fde047)',
        glow: '0 0 7px rgba(249, 115, 22, 0.95), 0 0 16px rgba(239, 68, 68, 0.6)', anim: 'phoenix' },
    { id: 'crown', name: '왕관', color: '#facc15', price: FRAME_PRICE_EPIC_PLUS,
        gradient: 'linear-gradient(135deg, #fff3b0 0%, #e6b422 25%, #a8740a 50%, #e6b422 75%, #fff3b0 100%)',
        glow: '0 0 0 2px #fff3b0, 0 0 0 4px #b8860b, 0 0 14px rgba(250, 204, 21, 0.75)', anim: 'crown' },
    // 어둠이 대부분을 차지하고 보라·분홍 빛이 소용돌이친다. 완전한 검정은 어두운 배경에 묻혀 빈 띠처럼 보이므로 짙은 남보라로 둔다.
    { id: 'blackhole', name: '블랙홀', color: '#7c3aed', price: FRAME_PRICE_LEGEND,
        gradient: 'conic-gradient(from var(--frame-angle, 0deg), #1e1b4b 0deg, #2e1065 70deg, #7c3aed 120deg, #ec4899 150deg, #7c3aed 180deg, #2e1065 230deg, #1e1b4b 290deg, #4c1d95 330deg, #1e1b4b 360deg)',
        glow: '0 0 7px rgba(124, 58, 237, 0.9), 0 0 16px rgba(236, 72, 153, 0.5)', anim: 'blackhole' },
];

/** 테두리 탭에 보여 줄 순서 — 무료 → 비싼 순. 같은 가격은 위 목록 순서를 따른다 */
export const SORTED_AVATAR_FRAMES: AvatarFrame[] =
    [...AVATAR_FRAMES].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

export const DEFAULT_AVATAR_FRAME = 'yellow';

export const findFrame = (id?: string | null): AvatarFrame =>
    AVATAR_FRAMES.find(f => f.id === id) ?? AVATAR_FRAMES[0];

export const getFrameColor = (id?: string | null): string => findFrame(id).color;

export const isFrameFree = (f: AvatarFrame): boolean => !f.price;

/**
 * 아바타 상자에 펼칠 테두리 스타일. 그라데이션은 border-box 배경으로 그리므로
 * 안쪽 배경색(innerBg)을 padding-box 로 같이 깔아야 해서 background 를 통째로 돌려준다.
 * 이 스타일을 쓰는 요소에는 backgroundColor 를 따로 주지 말 것.
 */
export const frameStyle = (
    id: string | null | undefined,
    width: number,
    innerBg = '#cbd5e1',
    baseShadow?: string,
    /** 상자의 바깥 모서리 반지름(px). 사파이어의 안쪽 링이 이미지 모서리와 맞도록 쓴다 */
    radius?: number,
): CSSProperties => {
    const f = findFrame(id);
    const boxShadow = [baseShadow, f.glow].filter(Boolean).join(', ') || undefined;
    if (!f.gradient) {
        return { border: `${width}px solid ${f.color}`, backgroundColor: innerBg, boxShadow };
    }
    // 흐르는 테두리는 그라데이션을 3배로 키워 background-position 으로 흘려 보낸다
    const size = f.anim && !STATIC_SIZE_ANIMS.includes(f.anim) ? '300% 300%' : '100% 100%';
    // 빛줄기는 맨 위 레이어(300% 폭)로 깔고 위치만 애니메이션한다 — 아바타 그림이 안쪽을 덮으므로 테두리에만 보인다
    const sweepLayer = f.sweep ? `${f.sweep} 0% 0 / 300% 100% no-repeat border-box, ` : '';
    const innerRadius = radius === undefined ? {} : { '--frame-ir': `${Math.max(radius - width, 0)}px` };
    return {
        ...innerRadius,
        border: `${width}px solid transparent`,
        background: `${sweepLayer}linear-gradient(${innerBg}, ${innerBg}) 0 0 / 100% 100% no-repeat padding-box, ${f.gradient} 0% 50% / ${size} no-repeat border-box`,
        boxShadow,
    } as CSSProperties;
};

/** 움직이는 테두리에 붙일 클래스. 랭킹(최대 100줄)에도 붙이고 있어 사용자가 늘면 부하가 커질 수 있다 - 그때는 상위 순위만 붙이도록 줄일 것. */
export const frameClass = (id?: string | null): string | undefined =>
    findFrame(id).anim ? `frame-${findFrame(id).anim}` : undefined;

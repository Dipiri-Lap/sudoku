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
    anim?: 'shimmer' | 'electric' | 'lava' | 'galaxy';
    price?: number;
}

export const FRAME_PRICE_COMMON = 100;
export const FRAME_PRICE_RARE = 200;
export const FRAME_PRICE_EPIC = 300;

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
    // 유료(희귀) — 빛 번짐이나 움직임이 더해진다
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
    // 유료(에픽) — 움직임과 빛을 함께 쓰거나 테두리를 두 겹으로 둘렀다
    { id: 'electric', name: '전기', color: '#22d3ee', price: FRAME_PRICE_EPIC,
        gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 25%, #ffffff 50%, #22d3ee 75%, #0891b2 100%)',
        glow: '0 0 6px rgba(34, 211, 238, 0.9), 0 0 14px rgba(255, 255, 255, 0.5)', anim: 'electric' },
    { id: 'lava', name: '용암', color: '#ef4444', price: FRAME_PRICE_EPIC,
        gradient: 'linear-gradient(135deg, #fde047 0%, #f97316 25%, #dc2626 50%, #f97316 75%, #fde047 100%)',
        glow: '0 0 6px rgba(239, 68, 68, 0.8), 0 0 12px rgba(249, 115, 22, 0.5)', anim: 'lava' },
    { id: 'galaxy', name: '은하', color: '#a855f7', price: FRAME_PRICE_EPIC,
        gradient: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 25%, #ec4899 50%, #6d28d9 75%, #1e1b4b 100%)',
        glow: '0 0 6px rgba(192, 132, 252, 0.8), 0 0 12px rgba(236, 72, 153, 0.45)', anim: 'galaxy' },
    { id: 'goldtwin', name: '이중 금테', color: '#e6b422', price: FRAME_PRICE_EPIC,
        gradient: 'linear-gradient(135deg, #fff3b0 0%, #e6b422 45%, #a8740a 100%)',
        glow: '0 0 0 2px #fff3b0, 0 0 0 4px #b8860b, 0 0 10px rgba(230, 180, 34, 0.6)' },
];

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
): CSSProperties => {
    const f = findFrame(id);
    const boxShadow = [baseShadow, f.glow].filter(Boolean).join(', ') || undefined;
    if (!f.gradient) {
        return { border: `${width}px solid ${f.color}`, backgroundColor: innerBg, boxShadow };
    }
    // 움직이는 테두리는 그라데이션을 3배로 키워 background-position 으로 흘려 보낸다
    const size = f.anim ? '300% 300%' : '100% 100%';
    return {
        border: `${width}px solid transparent`,
        background: `linear-gradient(${innerBg}, ${innerBg}) 0 0 / 100% 100% no-repeat padding-box, ${f.gradient} 0% 50% / ${size} no-repeat border-box`,
        boxShadow,
    };
};

/** 움직이는 테두리에 붙일 클래스. 랭킹처럼 수십 개가 한꺼번에 보이는 곳에는 붙이지 않는다. */
export const frameClass = (id?: string | null): string | undefined =>
    findFrame(id).anim ? `frame-${findFrame(id).anim}` : undefined;

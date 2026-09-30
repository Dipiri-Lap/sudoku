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
    price?: number;
}

export const FRAME_PRICE_COMMON = 100;

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
export const frameStyle = (id: string | null | undefined, width: number, innerBg = '#cbd5e1'): CSSProperties => {
    const f = findFrame(id);
    if (!f.gradient) {
        return { border: `${width}px solid ${f.color}`, backgroundColor: innerBg };
    }
    return {
        border: `${width}px solid transparent`,
        background: `linear-gradient(${innerBg}, ${innerBg}) padding-box, ${f.gradient} border-box`,
    };
};

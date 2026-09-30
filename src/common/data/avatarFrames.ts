/**
 * 프로필 아바타 테두리 색. 사용자 문서(users/{uid})의 avatarFrame 에 id 를 저장한다.
 * 값이 없거나 목록에 없는 id 면 기본(노랑)으로 그린다.
 */
export interface AvatarFrame {
    id: string;
    name: string;
    color: string;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
    { id: 'yellow', name: '노랑', color: '#fde047' },
    { id: 'orange', name: '주황', color: '#fb923c' },
    { id: 'red', name: '빨강', color: '#f87171' },
    { id: 'pink', name: '분홍', color: '#f472b6' },
    { id: 'purple', name: '보라', color: '#a78bfa' },
    { id: 'blue', name: '파랑', color: '#60a5fa' },
    { id: 'sky', name: '하늘', color: '#38bdf8' },
    { id: 'mint', name: '민트', color: '#2dd4bf' },
    { id: 'green', name: '초록', color: '#4ade80' },
    { id: 'white', name: '하양', color: '#f8fafc' },
    { id: 'gray', name: '회색', color: '#94a3b8' },
    { id: 'black', name: '검정', color: '#1e293b' },
];

export const DEFAULT_AVATAR_FRAME = 'yellow';

export const getFrameColor = (id?: string | null): string =>
    (AVATAR_FRAMES.find(f => f.id === id) ?? AVATAR_FRAMES[0]).color;

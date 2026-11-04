import { useCosmeticStore, type Cosmetic } from './cosmetics';

/** Puzzle-piece buddy look: body colors + one accessory */
export interface BuddySkin extends Cosmetic {
    top: string;
    side: string;
    cheek?: string;
    ink?: string;
    acc?:
        | 'bow' | 'sprout' | 'flower' | 'cat' | 'bunny' | 'bear' | 'frog' | 'chef' | 'headphones'
        | 'wizard' | 'pirate' | 'crown' | 'angel' | 'devil' | 'astro' | 'star';
    rainbow?: boolean;
    /** ambient effect around the buddy (epic / legendary) */
    fx?: 'steam' | 'notes' | 'sparkle' | 'coins' | 'royal' | 'holy' | 'flame' | 'orbit' | 'prism';
}

export const BUDDY_SKINS: BuddySkin[] = [
    { id: 'basic', name: '기본 조각', grade: 'common', free: true, top: '#ffffff', side: '#dcd6ea' },
    { id: 'peach', name: '복숭아', grade: 'common', top: '#ffd1bd', side: '#f2a98d' },
    { id: 'mint', name: '민트', grade: 'common', top: '#bff0d8', side: '#86d1ad' },
    { id: 'sky', name: '하늘', grade: 'common', top: '#c6e6ff', side: '#8cc3ef' },
    { id: 'lemon', name: '레몬', grade: 'common', top: '#fff1a0', side: '#f0cf4a' },
    { id: 'berry', name: '딸기 리본', grade: 'rare', top: '#ffb8c9', side: '#f17f9c', acc: 'bow' },
    { id: 'sprout', name: '새싹', grade: 'rare', top: '#e4f7c8', side: '#b2db7c', acc: 'sprout' },
    { id: 'grape', name: '포도 꽃', grade: 'rare', top: '#e1cff8', side: '#b396e6', acc: 'flower' },
    { id: 'star', name: '별 조각', grade: 'rare', top: '#2d3466', side: '#1c2148', cheek: '#ff8fb5', ink: '#ffffff', acc: 'star' },
    { id: 'cat', name: '고양이', grade: 'elite', top: '#ffd9a8', side: '#f0ae5e', acc: 'cat' },
    { id: 'bunny', name: '토끼', grade: 'elite', top: '#ffffff', side: '#e6dbe8', acc: 'bunny' },
    { id: 'bear', name: '곰돌이', grade: 'elite', top: '#d9a879', side: '#b07a4b', acc: 'bear' },
    { id: 'frog', name: '개구리', grade: 'elite', top: '#9ee07e', side: '#62b54b', acc: 'frog' },
    { id: 'chef', name: '요리사', grade: 'epic', top: '#ffe8d2', side: '#f0b98c', acc: 'chef', fx: 'steam' },
    { id: 'dj', name: 'DJ', grade: 'epic', top: '#c9f2ff', side: '#7fcde6', acc: 'headphones', fx: 'notes' },
    { id: 'wizard', name: '마법사', grade: 'epic', top: '#d7ccff', side: '#9f8be6', acc: 'wizard', fx: 'sparkle' },
    { id: 'pirate', name: '해적', grade: 'epic', top: '#ffe0b8', side: '#e0a868', acc: 'pirate', fx: 'coins' },
    { id: 'king', name: '임금님', grade: 'legendary', top: '#fff6d6', side: '#efcf7a', acc: 'crown', fx: 'royal' },
    { id: 'angel', name: '천사', grade: 'legendary', top: '#ffffff', side: '#dfe8ff', acc: 'angel', fx: 'holy' },
    { id: 'devil', name: '꼬마 악마', grade: 'legendary', top: '#ff9a9a', side: '#e05a5a', acc: 'devil', fx: 'flame' },
    { id: 'astro', name: '우주인', grade: 'legendary', top: '#f4f6ff', side: '#b9c2e6', acc: 'astro', fx: 'orbit' },
    { id: 'rainbow', name: '무지개', grade: 'legendary', top: '#ffffff', side: '#c9b8ff', rainbow: true, fx: 'prism' },
];

export function useBuddySkins() {
    return useCosmeticStore({
        items: BUDDY_SKINS,
        lsUnlocked: 'jigsaw-buddies-unlocked',
        lsSelected: 'jigsaw-buddy-selected',
        cloudUnlocked: 'unlockedJigsawBuddies',
        cloudSelected: 'selectedJigsawBuddy',
        defaultId: 'basic',
    });
}

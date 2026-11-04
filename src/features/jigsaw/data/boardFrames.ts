import { useCosmeticStore, type Cosmetic } from './cosmetics';

/** Decorative frames drawn AROUND the board (never over the picture). Looks live in JigsawFrames.css as `.frame-{id}`. */
export const BOARD_FRAMES: Cosmetic[] = [
    { id: 'basic', name: '기본', grade: 'common', free: true },
    { id: 'wood', name: '나무 액자', grade: 'common' },
    { id: 'cream', name: '크림 바느질', grade: 'common' },
    { id: 'mint', name: '민트 도트', grade: 'common' },
    { id: 'sky', name: '하늘 구름', grade: 'common' },
    { id: 'check', name: '피크닉 체크', grade: 'rare' },
    { id: 'candy', name: '사탕 줄무늬', grade: 'rare' },
    { id: 'polka', name: '분홍 물방울', grade: 'rare' },
    { id: 'denim', name: '청바지', grade: 'rare' },
    { id: 'tile', name: '타일 벽', grade: 'rare' },
    { id: 'gold', name: '황금 액자', grade: 'elite' },
    { id: 'silver', name: '은빛 액자', grade: 'elite' },
    { id: 'leaf', name: '나뭇잎', grade: 'elite' },
    { id: 'flower', name: '벚꽃', grade: 'elite' },
    { id: 'wave', name: '파도', grade: 'elite' },
    { id: 'cookie', name: '초코칩 쿠키', grade: 'elite' },
    { id: 'rainbow', name: '무지개 회전', grade: 'epic' },
    { id: 'neon', name: '네온', grade: 'epic' },
    { id: 'night', name: '반짝 밤하늘', grade: 'epic' },
    { id: 'jelly', name: '말랑 젤리', grade: 'epic' },
    { id: 'bubble', name: '비눗방울', grade: 'epic' },
    { id: 'heart', name: '두근 하트', grade: 'epic' },
    { id: 'disco', name: '디스코', grade: 'epic' },
    { id: 'petal', name: '꽃잎 바람', grade: 'epic' },
    { id: 'aurora', name: '오로라', grade: 'legendary' },
    { id: 'galaxy', name: '은하수', grade: 'legendary' },
    { id: 'fire', name: '불꽃', grade: 'legendary' },
    { id: 'diamond', name: '다이아몬드', grade: 'legendary' },
    { id: 'prism', name: '홀로그램', grade: 'legendary' },
    { id: 'thunder', name: '번개', grade: 'legendary' },
    { id: 'crown', name: '왕관', grade: 'legendary' },
    { id: 'lava', name: '용암', grade: 'legendary' },
    { id: 'starfall', name: '유성우', grade: 'legendary' },
];

export function useBoardFrames() {
    return useCosmeticStore({
        items: BOARD_FRAMES,
        lsUnlocked: 'jigsaw-frames-unlocked',
        lsSelected: 'jigsaw-frame-selected',
        cloudUnlocked: 'unlockedJigsawFrames',
        cloudSelected: 'selectedJigsawFrame',
        defaultId: 'basic',
    });
}

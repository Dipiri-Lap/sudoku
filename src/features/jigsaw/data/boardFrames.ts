import i18n from '../../../i18n';
import { useCosmeticStore, type Cosmetic } from './cosmetics';

/** Decorative frames drawn AROUND the board (never over the picture). Looks live in JigsawFrames.css as `.frame-{id}`. */
export const BOARD_FRAMES: Cosmetic[] = [
    { id: 'basic', name: i18n.t('jigsaw:frames.basic'), grade: 'common', free: true },
    { id: 'wood', name: i18n.t('jigsaw:frames.wood'), grade: 'common' },
    { id: 'cream', name: i18n.t('jigsaw:frames.cream'), grade: 'common' },
    { id: 'mint', name: i18n.t('jigsaw:frames.mint'), grade: 'common' },
    { id: 'sky', name: i18n.t('jigsaw:frames.sky'), grade: 'common' },
    { id: 'check', name: i18n.t('jigsaw:frames.check'), grade: 'rare' },
    { id: 'candy', name: i18n.t('jigsaw:frames.candy'), grade: 'rare' },
    { id: 'polka', name: i18n.t('jigsaw:frames.polka'), grade: 'rare' },
    { id: 'denim', name: i18n.t('jigsaw:frames.denim'), grade: 'rare' },
    { id: 'tile', name: i18n.t('jigsaw:frames.tile'), grade: 'rare' },
    { id: 'gold', name: i18n.t('jigsaw:frames.gold'), grade: 'elite' },
    { id: 'silver', name: i18n.t('jigsaw:frames.silver'), grade: 'elite' },
    { id: 'leaf', name: i18n.t('jigsaw:frames.leaf'), grade: 'elite' },
    { id: 'flower', name: i18n.t('jigsaw:frames.flower'), grade: 'elite' },
    { id: 'wave', name: i18n.t('jigsaw:frames.wave'), grade: 'elite' },
    { id: 'cookie', name: i18n.t('jigsaw:frames.cookie'), grade: 'elite' },
    { id: 'rainbow', name: i18n.t('jigsaw:frames.rainbow'), grade: 'epic' },
    { id: 'neon', name: i18n.t('jigsaw:frames.neon'), grade: 'epic' },
    { id: 'night', name: i18n.t('jigsaw:frames.night'), grade: 'epic' },
    { id: 'jelly', name: i18n.t('jigsaw:frames.jelly'), grade: 'epic' },
    { id: 'bubble', name: i18n.t('jigsaw:frames.bubble'), grade: 'epic' },
    { id: 'heart', name: i18n.t('jigsaw:frames.heart'), grade: 'epic' },
    { id: 'disco', name: i18n.t('jigsaw:frames.disco'), grade: 'epic' },
    { id: 'petal', name: i18n.t('jigsaw:frames.petal'), grade: 'epic' },
    { id: 'aurora', name: i18n.t('jigsaw:frames.aurora'), grade: 'legendary' },
    { id: 'galaxy', name: i18n.t('jigsaw:frames.galaxy'), grade: 'legendary' },
    { id: 'fire', name: i18n.t('jigsaw:frames.fire'), grade: 'legendary' },
    { id: 'diamond', name: i18n.t('jigsaw:frames.diamond'), grade: 'legendary' },
    { id: 'prism', name: i18n.t('jigsaw:frames.prism'), grade: 'legendary' },
    { id: 'thunder', name: i18n.t('jigsaw:frames.thunder'), grade: 'legendary' },
    { id: 'crown', name: i18n.t('jigsaw:frames.crown'), grade: 'legendary' },
    { id: 'lava', name: i18n.t('jigsaw:frames.lava'), grade: 'legendary' },
    { id: 'starfall', name: i18n.t('jigsaw:frames.starfall'), grade: 'legendary' },
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

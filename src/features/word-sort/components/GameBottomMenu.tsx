import React from 'react';
import { RotateCcw, Undo2, Layers as LayersIcon } from 'lucide-react';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';
import levelsKo from '../data/levels.json';
import levelsEn from '../data/levels_en.json';
import { i18n } from '../data/i18n';

interface GameBottomMenuProps {
    triggerDealing: (n: number) => void;
    levelStackTotal: (ld: any) => number;
    resetUnlocks: () => void;
}

export const GameBottomMenu: React.FC<GameBottomMenuProps> = ({ triggerDealing, levelStackTotal, resetUnlocks }) => {
    const { state, dispatch } = useWordSort();
    const {
        coins,
        spendCoins,
        isRemoveMode,
        setIsRemoveMode,
        tutorialStep,
        openUndoConfirm,
        openRemoveConfirm,
        language,
        isHardMode,
        isHelpBlocked,
        resetHardModeHelp,
    } = useWordSortUI();

    const t = i18n[language];
    const levels = language === 'en' ? levelsEn : levelsKo;

    if (tutorialStep !== null) return null;

    const undoBlocked = isHelpBlocked('undo');
    const removeBlocked = isHelpBlocked('remove');
    const undoAvail = state.history.length > 0 && !undoBlocked;
    const undoCanAfford = coins >= 10;
    const removeAvail = !removeBlocked;
    const removeCanAfford = coins >= 50;

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '1rem 0.5rem',
            marginTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{ textAlign: 'center' }}>
                <RotateCcw size={24} style={{ cursor: 'pointer' }} onClick={() => {
                    const currentLevelData = levels.find((l: any) => l.id === state.level) || levels[0];
                    resetUnlocks();
                    resetHardModeHelp();
                    dispatch({ type: 'START_LEVEL', levelData: currentLevelData, hardMode: isHardMode });
                    triggerDealing(levelStackTotal(currentLevelData));
                }} />
                <div style={{ fontSize: '0.7rem' }}>{t.retry}</div>
            </div>
            <div
                style={{
                    textAlign: 'center',
                    cursor: undoAvail ? 'pointer' : 'not-allowed',
                    color: undoBlocked ? 'rgba(255,80,80,0.4)' : (undoAvail ? 'white' : 'rgba(255,255,255,0.3)'),
                    opacity: undoBlocked ? 0.4 : (undoAvail ? 1 : 0.5),
                    position: 'relative',
                }}
                title={undoBlocked ? '하드모드: 다른 도움 기능을 이미 사용했습니다' : undefined}
                onClick={() => {
                    if (undoBlocked || state.history.length === 0) return;
                    openUndoConfirm();
                }}
            >
                <Undo2 size={24} style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>{language === 'ko' ? '철회' : 'Undo'}</div>
                {undoBlocked
                    ? <div style={{ fontSize: '0.65rem', color: 'rgba(255,80,80,0.6)', fontWeight: 'bold' }}>⛔ 불가</div>
                    : !undoCanAfford
                        ? <div style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 'bold' }}>🎬 광고</div>
                        : <div style={{ fontSize: '0.65rem', color: '#fda085', fontWeight: 'bold' }}>🪙 10</div>
                }
            </div>
            <div
                style={{
                    textAlign: 'center',
                    cursor: (isRemoveMode || removeAvail) ? 'pointer' : 'not-allowed',
                    color: (removeBlocked && !isRemoveMode) ? 'rgba(255,80,80,0.4)' : (isRemoveMode ? '#ff6b6b' : (removeAvail ? 'white' : 'rgba(255,255,255,0.3)')),
                    opacity: (removeBlocked && !isRemoveMode) ? 0.4 : (isRemoveMode ? 1 : (removeAvail ? 1 : 0.5)),
                }}
                title={(removeBlocked && !isRemoveMode) ? '하드모드: 도움 기능을 이미 사용했습니다' : undefined}
                onClick={() => {
                    if (isRemoveMode) {
                        setIsRemoveMode(false);
                        return;
                    }
                    if (removeBlocked) return;
                    openRemoveConfirm();
                }}
            >
                <LayersIcon size={24} style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>{isRemoveMode ? t.cancel : (language === 'ko' ? '제거' : 'Remove')}</div>
                {!isRemoveMode && (
                    removeBlocked
                        ? <div style={{ fontSize: '0.65rem', color: 'rgba(255,80,80,0.6)', fontWeight: 'bold' }}>⛔ 불가</div>
                        : !removeCanAfford
                            ? <div style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 'bold' }}>🎬 광고</div>
                            : <div style={{ fontSize: '0.65rem', color: '#fda085', fontWeight: 'bold' }}>🪙 50</div>
                )}
            </div>
        </div>
    );
};

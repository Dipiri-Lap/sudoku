import React from 'react';
import { RotateCcw, Undo2, Layers as LayersIcon } from 'lucide-react';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';
import levels from '../data/levels.json';

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
        setShowUndoConfirm,
        setShowRemoveConfirm,
    } = useWordSortUI();

    if (tutorialStep !== null) return null;

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '1rem 0.5rem',
            marginTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{ textAlign: 'center' }}>
                <RotateCcw size={24} onClick={() => {
                    const currentLevelData = levels.find((l: any) => l.id === state.level) || levels[0];
                    resetUnlocks();
                    dispatch({ type: 'START_LEVEL', levelData: currentLevelData });
                    triggerDealing(levelStackTotal(currentLevelData));
                }} />
                <div style={{ fontSize: '0.7rem' }}>재시작</div>
            </div>
            <div
                style={{
                    textAlign: 'center',
                    cursor: (state.history.length > 0 && coins >= 10) ? 'pointer' : 'not-allowed',
                    color: (state.history.length > 0 && coins >= 10) ? 'white' : 'rgba(255,255,255,0.3)',
                    opacity: (state.history.length > 0 && coins >= 10) ? 1 : 0.5
                }}
                onClick={() => {
                    if (state.history.length === 0) return;
                    setShowUndoConfirm(true);
                }}
            >
                <Undo2 size={24} style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>철회</div>
                <div style={{ fontSize: '0.65rem', color: '#fda085', fontWeight: 'bold' }}>🪙 10</div>
            </div>
            <div
                style={{
                    textAlign: 'center',
                    cursor: (coins >= 50 || isRemoveMode) ? 'pointer' : 'not-allowed',
                    color: isRemoveMode ? '#ff6b6b' : (coins >= 50 ? 'white' : 'rgba(255,255,255,0.3)'),
                    opacity: isRemoveMode ? 1 : (coins >= 50 ? 1 : 0.5)
                }}
                onClick={() => {
                    if (isRemoveMode) {
                        setIsRemoveMode(false);
                    } else {
                        setShowRemoveConfirm(true);
                    }
                }}
            >
                <LayersIcon size={24} style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>{isRemoveMode ? '취소' : '제거'}</div>
                {!isRemoveMode && <div style={{ fontSize: '0.65rem', color: '#fda085', fontWeight: 'bold' }}>🪙 50</div>}
            </div>
        </div>
    );
};

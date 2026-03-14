import React from 'react';
import TutorialOverlay from './TutorialOverlay';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';
import levels from '../data/levels.json';

interface GameOverlaysProps {
    showResumeConfirm: boolean;
    pendingSavedState: any;
    handleResumeConfirm: (confirmed: boolean) => void;
    triggerDealing: (n: number) => void;
    levelStackTotal: (ld: any) => number;
    resetUnlocks: () => void;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
    showResumeConfirm,
    pendingSavedState,
    handleResumeConfirm,
    triggerDealing,
    levelStackTotal,
    resetUnlocks,
}) => {
    const { state, dispatch } = useWordSort();
    const {
        tutorialStep,
        setTutorialStep,
        completeTutorial,
        isDealingAnimation,
        isRemoveMode,
        gatheringCat,
        showGameOverOverlay,
        coins,
    } = useWordSortUI();

    return (
        <>
            {/* Interaction blocker during dealing animation */}
            {isDealingAnimation && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} />
            )}

            {/* Remove mode instruction banner */}
            {isRemoveMode && !gatheringCat && (
                <div style={{
                    position: 'fixed',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '20px',
                    zIndex: 10000,
                    fontWeight: 'bold',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    제거할 카테고리 카드를 선택하세요
                </div>
            )}

            {/* Interaction blocker for step 1 (welcome screen — must press 다음 first) */}
            {tutorialStep === 1 && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9500 }} />
            )}

            {/* Game Over Overlay */}
            {showGameOverOverlay && tutorialStep === null && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>💀</div>
                    <h2 style={{ fontSize: '2.2rem', color: '#e74c3c', marginBottom: '0.5rem', fontWeight: 'bold' }}>GAME OVER</h2>
                    <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
                        남은 횟수를 모두 소진했습니다
                    </div>
                    <a
                        href={`/word-sort?level=${state.level}`}
                        style={{
                            padding: '0.8rem 2.5rem', fontSize: '1.2rem', borderRadius: '30px',
                            border: 'none', background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                            color: 'white', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(231,76,60,0.4)',
                            textDecoration: 'none',
                            display: 'inline-block'
                        }}
                    >재시작 🔄</a>
                </div>
            )}

            {/* Win Overlay */}
            {state.isWinner && tutorialStep === null && (() => {
                const nextLevelIdx = levels.findIndex((l: any) => l.id === state.level + 1);
                const hasNextLevel = nextLevelIdx >= 0;
                const handleNext = () => {
                    resetUnlocks();
                    if (hasNextLevel) {
                        dispatch({ type: 'START_LEVEL', levelData: levels[nextLevelIdx] });
                        triggerDealing(levelStackTotal(levels[nextLevelIdx]));
                    } else {
                        // All levels cleared — restart from level 1
                        dispatch({ type: 'START_LEVEL', levelData: levels[0] });
                        triggerDealing(levelStackTotal(levels[0]));
                    }
                };
                return (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <h2 style={{ fontSize: '2.5rem', color: '#f1c40f', marginBottom: '0.5rem' }}>🎉 VICTORY!</h2>
                        <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>
                            LEVEL {state.level} 클리어!
                        </div>
                        {!hasNextLevel ? (
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🛠️</div>
                                <div style={{ fontSize: '1.05rem', color: 'white', fontWeight: '700', marginBottom: '0.4rem' }}>
                                    모든 레벨을 클리어했습니다!
                                </div>
                                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                                    새로운 레벨을 열심히 제작 중입니다.<br />
                                    조금만 기다려 주세요 😊
                                </div>
                            </div>
                        ) : null}
                        {hasNextLevel && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <a
                                    href={`/word-sort?level=${state.level + 1}`}
                                    style={{ 
                                        padding: '0.8rem 2.5rem', fontSize: '1.2rem', borderRadius: '30px', 
                                        border: 'none', background: 'linear-gradient(135deg, #f6d365, #f39c12)', 
                                        color: 'white', fontWeight: 'bold', cursor: 'pointer', 
                                        boxShadow: '0 4px 15px rgba(243,156,18,0.4)',
                                        textDecoration: 'none',
                                        display: 'inline-block'
                                    }}
                                >다음 레벨 →</a>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Tutorial Overlay */}
            {tutorialStep !== null && (
                <TutorialOverlay
                    step={tutorialStep}
                    onNext={() => {
                        if (tutorialStep === 1) setTutorialStep(2);
                        else if (tutorialStep === 5) setTutorialStep(6);
                        else if (tutorialStep === 6) setTutorialStep(7);
                        else if (tutorialStep === 8) completeTutorial();
                    }}
                    onSkip={completeTutorial}
                />
            )}

            {/* Resume Game Confirm Dialog */}
            {showResumeConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #2c3e50, #34495e)',
                        borderRadius: '24px', padding: '2rem',
                        textAlign: 'center', width: '300px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧩</div>
                        <h3 style={{ color: 'white', marginBottom: '0.75rem', fontSize: '1.25rem' }}>게임을 이어서 하시겠습니까?</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            이전에 중단된 게임 데이터가 있습니다.<br />
                            계속해서 플레이하시겠습니까?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => handleResumeConfirm(false)}
                                style={{
                                    flex: 1, padding: '0.75rem', borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'transparent', color: 'white',
                                    cursor: 'pointer', fontWeight: '600'
                                }}
                            >새 게임</button>
                            <button
                                onClick={() => handleResumeConfirm(true)}
                                style={{
                                    flex: 1, padding: '0.75rem', borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                                    color: 'white', fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                                }}
                            >이어서하기</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

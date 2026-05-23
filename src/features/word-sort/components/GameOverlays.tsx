import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { House, ArrowRight, Construction } from 'lucide-react';
import TutorialOverlay from './TutorialOverlay';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';
import levelsKo from '../data/levels.json';
import levelsEn from '../data/levels_en.json';

interface GameOverlaysProps {
    showResumeConfirm: boolean;
    handleResumeConfirm: (confirmed: boolean) => void;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
    showResumeConfirm,
    handleResumeConfirm,
}) => {
    const { state } = useWordSort();
    const navigate = useNavigate();
    const [showComingSoon, setShowComingSoon] = useState(false);

    const levels = state.language === 'en' ? levelsEn : levelsKo;
    const maxLevelId = (levels as any[]).reduce((max: number, l: any) => Math.max(max, l.id), 0);
    const isLastLevel = state.level >= maxLevelId;

    const handleNextLevel = () => {
        if (isLastLevel) { setShowComingSoon(true); return; }
        const url = `/word-sort/play?level=${state.level + 1}`;
        if (import.meta.env.DEV || !window.adBreak) { navigate(url); return; }
        window.adBreak({ type: 'next', name: 'level-complete', adBreakDone: () => navigate(url) });
    };
    const {
        tutorialStep,
        setTutorialStep,
        completeTutorial,
        isDealingAnimation,
        isRemoveMode,
        gatheringCat,
        showGameOverOverlay,
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
            {state.isWinner && tutorialStep === null && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-fade-in">
                            <div className="modal-header">
                                <h2>🎉 축하합니다!</h2>
                            </div>
                            <div className="modal-body">
                                <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>
                                    LEVEL <span style={{ color: '#e2e8f0' }}>{state.level}</span> 클리어!
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef9e7', border: '1px solid #f4c430', borderRadius: '20px', padding: '0.4rem 0.9rem', fontWeight: 700, color: '#b8860b', fontSize: '0.95rem' }}>
                                        🪙 +10
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#eef2ff', border: '1px solid #6366f1', borderRadius: '20px', padding: '0.4rem 0.9rem', fontWeight: 700, color: '#4338ca', fontSize: '0.95rem' }}>
                                        ⚡ 퍼즐력 +1
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ flexDirection: 'row', gap: '0.5rem' }}>
                                <a href="/word-sort" className="modal-home-btn" style={{ textDecoration: 'none' }}>
                                    <House size={22} />
                                </a>
                                <button
                                    onClick={handleNextLevel}
                                    className="primary-btn bonus-btn"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1 }}
                                >
                                    다음 레벨로 <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
            )}

            {/* Coming Soon Overlay — shown when user clears the last available level */}
            {showComingSoon && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in" style={{ textAlign: 'center' }}>
                        <div className="modal-header" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                            <Construction size={48} color="#f59e0b" />
                            <h2 style={{ margin: 0 }}>제작 중</h2>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                모든 레벨을 클리어했습니다! 🎊<br />
                                새로운 레벨이 곧 추가될 예정입니다.<br />
                                조금만 기다려 주세요.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <a href="/word-sort" className="modal-home-btn" style={{ textDecoration: 'none', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                <House size={20} /> 홈으로
                            </a>
                        </div>
                    </div>
                </div>
            )}

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

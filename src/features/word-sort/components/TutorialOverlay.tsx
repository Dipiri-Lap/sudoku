import React from 'react';

export interface TutorialStepConfig {
    message: string;
    subMessage: string;
    showNext: boolean;
    nextLabel?: string;
}

export const TUTORIAL_STEPS: Record<number, TutorialStepConfig> = {
    1: {
        message: '단어 정렬 게임에 오신 걸 환영합니다! 👋',
        subMessage: '카테고리에 맞게 모든 단어 카드를 정렬하면 클리어! 함께 배워볼게요.',
        showNext: true,
    },
    2: {
        message: '👑 카테고리 카드를 빈 슬롯에 드래그하세요',
        subMessage: '왕관 아이콘이 있는 주황 테두리 카드가 카테고리 카드예요. 반짝이는 카드를 위쪽 슬롯(✦)으로 드래그하세요!',
        showNext: false,
    },
    3: {
        message: '🃏 덱을 눌러 카드를 뽑아보세요',
        subMessage: '오른쪽 위 덱(카드 더미)을 클릭하면 숨겨진 카드를 한 장 공개할 수 있어요.',
        showNext: false,
    },
    4: {
        message: '✨ 단어 카드를 알맞은 슬롯에 드래그하세요',
        subMessage: '반짝이는 단어 카드를 같은 카테고리 슬롯으로 드래그하세요. 슬롯이 채워지는 것을 확인하세요!',
        showNext: false,
    },
    5: {
        message: '🔀 단어 카드는 스택 사이를 자유롭게 이동할 수 있어요',
        subMessage: '반짝이는 딸기 카드를 사과 카드가 있는 스택으로 드래그해 같은 카테고리끼리 모아보세요!',
        showNext: false,
    },
    6: {
        message: '📦 여러 장을 한 번에 슬롯으로 이동할 수 있어요',
        subMessage: '반짝이는 과일 카드 묶음을 과일 슬롯으로 한 번에 드래그해 넣어보세요!',
        showNext: false,
    },
    7: {
        message: '🐾 마지막 단계! 동물 카테고리를 완성하세요',
        subMessage: '덱에 있는 동물 카테고리 카드를 빈 슬롯에 놓고, 남은 동물 카드들을 모두 슬롯으로 이동하세요!',
        showNext: false,
    },
    8: {
        message: '🎉 완벽해요! 이제 게임을 즐겨보세요!',
        subMessage: '튜토리얼을 마쳤어요. 덱에서 카드를 뽑고, 스택을 정리하며 모든 단어를 카테고리별로 완성하세요.',
        showNext: true,
        nextLabel: '게임 시작!',
    },
};

export const TOTAL_STEPS = Object.keys(TUTORIAL_STEPS).length;

interface TutorialOverlayProps {
    step: number;
    onNext: () => void;
    onSkip: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip }) => {
    const config = TUTORIAL_STEPS[step];
    if (!config) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(12, 12, 30, 0.97)',
            padding: '1.1rem 1.4rem 1.8rem',
            zIndex: 10000,
            borderTop: '2px solid rgba(74, 222, 128, 0.45)',
            boxShadow: '0 -6px 28px rgba(0,0,0,0.65)',
        }}>
            {/* Step dots + skip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                        <div key={i} style={{
                            width: i + 1 === step ? '22px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            background: i + 1 <= step ? '#4ade80' : 'rgba(255,255,255,0.18)',
                            transition: 'all 0.3s ease',
                        }} />
                    ))}
                </div>
                <button
                    onClick={onSkip}
                    style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: 'rgba(255,255,255,0.4)',
                        padding: '4px 14px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontFamily: 'inherit',
                    }}
                >
                    건너뛰기
                </button>
            </div>

            {/* Message */}
            <div style={{ color: 'white', fontSize: '1rem', fontWeight: '700', lineHeight: '1.4', marginBottom: '0.4rem' }}>
                {config.message}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.85rem', lineHeight: '1.55', marginBottom: config.showNext ? '1rem' : '0.35rem' }}>
                {config.subMessage}
            </div>

            {config.showNext ? (
                <button
                    onClick={onNext}
                    style={{
                        background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                        color: '#0f1a10',
                        border: 'none',
                        padding: '0.75rem 2rem',
                        borderRadius: '24px',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        width: '100%',
                        fontFamily: 'inherit',
                        boxShadow: '0 4px 14px rgba(74, 222, 128, 0.4)',
                    }}
                >
                    {config.nextLabel ?? '다음 →'}
                </button>
            ) : (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', textAlign: 'center' }}>
                    ↑ 반짝이는 카드 또는 영역을 조작하세요
                </div>
            )}
        </div>
    );
};

export default TutorialOverlay;

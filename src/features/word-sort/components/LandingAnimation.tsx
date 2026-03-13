import React from 'react';
import { Crown } from 'lucide-react';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';

export const LandingAnimation: React.FC = () => {
    const { state } = useWordSort();
    const {
        landingGroup,
        finalCardWidth,
        cardHeight,
        visibleHeight,
        stackCardStyle,
        splitText,
    } = useWordSortUI();

    if (!landingGroup?.isProxy || !landingGroup.movingCards) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9999
        }}>
            {landingGroup.movingCards.map((card: any, idx: number) => {
                return (
                    <div
                        key={card.id}
                        style={{
                            ...stackCardStyle,
                            position: 'absolute',
                            width: `${finalCardWidth}px`,
                            height: `${cardHeight}px`,
                            flexShrink: 0,
                            left: `${(landingGroup.targetX ?? 0) - finalCardWidth / 2}px`,
                            top: `${(landingGroup.targetY ?? 0) - cardHeight / 2}px`,
                            backgroundColor: card.type === 'category' ? '#fff9f2' : '#ffffff',
                            backgroundImage: 'none',
                            color: '#333',
                            border: card.type === 'category' ? '3px solid #ff9f43' : '3px solid #999999',
                            boxShadow: card.type === 'category' ? '0 0 15px rgba(255,159,67,0.3)' : '0 2px 5px rgba(0,0,0,0.1)',
                            zIndex: 1000 + idx,
                            transform: landingGroup.animating
                                ? (landingGroup.targetType === 'stack' ? `translate(0, ${idx * visibleHeight}px)` : 'none')
                                : `translate(${landingGroup.offsetX}px, ${landingGroup.offsetY + idx * visibleHeight}px)`,
                            transition: landingGroup.animating
                                ? 'transform 0.35s cubic-bezier(0.2, 0.8, 0.4, 1)'
                                : 'none',
                            transitionDelay: (landingGroup.animating && landingGroup.targetType === 'slot')
                                ? `${idx * 40}ms`
                                : '0ms',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '5px'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            inset: '2px',
                            border: card.type === 'category' ? '1px solid #ffba75' : '1px solid #777777',
                            borderRadius: '3px',
                            pointerEvents: 'none',
                            zIndex: 1
                        }} />
                        {card.type === 'category' && (() => {
                            const category = state.categories.find((c: any) => c.id === card.cat);
                            return (
                                <>
                                    <div style={{ position: 'absolute', top: '4px', left: '6px', color: '#ff9f43', fontSize: '0.65rem', fontWeight: '900', zIndex: 2 }}>
                                        0/{category?.words?.length ?? 5}
                                    </div>
                                    <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43', zIndex: 2 }}>
                                        <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                    </div>
                                </>
                            );
                        })()}
                        <span style={{
                            fontWeight: '900',
                            fontSize: card.type === 'category' ? '0.9rem' : '0.85rem',
                            zIndex: 2
                        }}>
                            {card.value}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

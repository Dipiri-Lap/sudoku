import React from 'react';
import { Crown } from 'lucide-react';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';

export const DragGhost: React.FC = () => {
    const { state } = useWordSort();
    const {
        draggingGroup,
        dragGhostPos,
        nearestValidTarget,
        finalCardWidth,
        cardHeight,
        visibleHeight,
        stackCardStyle,
        faceDownPattern,
        cardTextSize,
        splitText,
    } = useWordSortUI();

    if (!draggingGroup || !dragGhostPos) return null;

    const ghostCards = draggingGroup.type === 'deck'
        ? [state.revealedDeck[state.revealedDeck.length - 1]]
        : state.stacks[draggingGroup.index]?.slice(
            draggingGroup.cardIndex ?? 0,
            (draggingGroup.cardIndex ?? 0) + (draggingGroup.count ?? 1)
          );

    if (!ghostCards?.length) return null;

    const totalHeight = (ghostCards.length - 1) * visibleHeight + cardHeight;

    return (
        <div style={{
            position: 'fixed',
            left: `${dragGhostPos.x - (draggingGroup.grabOffsetX ?? 0)}px`,
            top: `${dragGhostPos.y - (draggingGroup.grabOffsetY ?? 0)}px`,
            pointerEvents: 'none',
            zIndex: 10000,
            width: `${finalCardWidth}px`,
            height: `${totalHeight}px`,
        }}>
            {ghostCards.map((card, idx) => {
                const isTop = idx === ghostCards.length - 1;
                return (
                    <div key={card.id} style={{
                        ...stackCardStyle,
                        position: 'absolute',
                        top: `${idx * visibleHeight}px`,
                        left: 0,
                        width: `${finalCardWidth}px`,
                        height: `${cardHeight}px`,
                        zIndex: idx,
                        backgroundColor: card.isRevealed ? (card.type === 'category' ? '#fff9f2' : '#ffffff') : 'transparent',
                        backgroundImage: card.isRevealed ? 'none' : faceDownPattern,
                        backgroundSize: '100% 100%',
                        color: card.isRevealed ? '#333' : 'transparent',
                        border: card.isRevealed ? (nearestValidTarget ? '3px solid #2ecc71' : (card.type === 'category' ? '3px solid #ff9f43' : '3px solid #999999')) : 'none',
                        boxShadow: isTop ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
                        padding: '5px',
                    }}>
                        {card.isRevealed && (
                            <>
                                <div style={{
                                    position: 'absolute',
                                    inset: '2px',
                                    border: nearestValidTarget ? '1px solid #27ae60' : (card.type === 'category' ? '1px solid #ffba75' : '1px solid #777777'),
                                    borderRadius: '3px',
                                    pointerEvents: 'none',
                                    zIndex: 1
                                }} />
                                <div style={{
                                    height: '100%',
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: isTop ? 'center' : 'flex-start',
                                    alignItems: 'center',
                                    paddingTop: '0',
                                    position: 'relative'
                                }}>
                                    {card.type === 'category' && (() => {
                                        const category = state.categories.find(c => c.id === card.cat);
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
                                        fontSize: `${cardTextSize}rem`,
                                        lineHeight: '1.2',
                                        zIndex: 2,
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {splitText(card.value)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

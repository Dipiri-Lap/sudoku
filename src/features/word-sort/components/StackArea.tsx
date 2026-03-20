import React from 'react';
import { Crown } from 'lucide-react';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';

export const StackArea: React.FC = () => {
    const { state } = useWordSort();
    const {
        finalCardWidth,
        cardHeight,
        visibleHeight,
        stackCardStyle,
        faceDownPattern,
        cardTextSize,
        draggingGroup,
        setDraggingGroup,
        setDragGhostPos,
        setNearestValidTarget,
        handleDragMove,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
        landingGroup,
        gatheringCat,
        gatherPhase,
        gatherOffsets,
        isRemoveMode,
        handleDragStart,
        handleDrop,
        tutorialStep,
        tutorialHighlightCards,
        setUnlockConfirm,
        isDealingAnimation,
        dealingProgress,
        stackStartIndices,
        stackRefs,
        splitText,
        handleRemoveClick,
    } = useWordSortUI();

    const { lockedStacks } = state;
    const gap = 5;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${state.stacks.length + (tutorialStep === null ? lockedStacks : 0)}, ${finalCardWidth}px)`,
            gap: `${gap}px`,
            alignItems: 'flex-start',
            maxWidth: 'fit-content',
            marginInline: 'auto',
            position: 'relative',
            zIndex: gatheringCat ? 6000 : 1
        }}>
            {/* 1. Locks on the left */}
            {tutorialStep === null && Array.from({ length: lockedStacks }).map((_, i) => (
                <div
                    key={`locked-stack-${i}`}
                    onClick={() => setUnlockConfirm('stack')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        minHeight: `${cardHeight}px`,
                        cursor: 'pointer',
                    }}
                >
                    <div style={{
                        ...stackCardStyle,
                        width: `${finalCardWidth}px`,
                        height: `${cardHeight}px`,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1.5px dashed rgba(255,255,255,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                    }}>
                        <span style={{ fontSize: '1.1rem' }}>🔒</span>
                        <span style={{ fontSize: '0.55rem', textAlign: 'center', lineHeight: 1.2 }}>잠금 해제</span>
                        <span style={{ fontSize: '0.6rem', color: '#fda085', fontWeight: '700' }}>🪙 50</span>
                    </div>
                </div>
            ))}

            {/* 2. Active Stacks - natural order: newly unlocked (prepended) appears leftmost */}
            {state.stacks.map((stack, sIdx) => {
                return (
                    <div
                        key={sIdx}
                        ref={el => { stackRefs.current[sIdx] = el; }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={(e) => { handleDrop(e); e.stopPropagation(); }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            minHeight: `${cardHeight}px`
                        }}
                    >
                        {(stack.length === 0 || (
                            draggingGroup?.type === 'stack' && draggingGroup.index === sIdx &&
                            (draggingGroup.cardIndex ?? 0) === 0 && (draggingGroup.count ?? 1) >= stack.length
                        )) && (
                                <div style={{ ...stackCardStyle, borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)' }} />
                            )}
                        {stack.map((card, cIdx) => {
                            const cardSeq = gatherOffsets.current.get(card.id)?.seq ?? 0;
                            const isGatheringTarget = gatheringCat === card.cat && gatherOffsets.current.has(card.id) && cardSeq <= gatherPhase;
                            const isMoving = gatheringCat === card.cat && gatherOffsets.current.has(card.id);
                            // Only reveal if it's actually their turn to move (cardSeq <= gatherPhase)
                            const isRevealed = !!card.isRevealed || (isMoving && cardSeq <= gatherPhase);
                            const numToCompress = Math.max(0, stack.length - 8);
                            const currentVisibleHeight = (cIdx < numToCompress && !isRevealed) ? 13 : visibleHeight;
                            const currentOverlapMargin = -(cardHeight - currentVisibleHeight);

                            // Drag evaluation: can drag if all cards ABOVE it match the target category
                            let canDrag = isRevealed;
                            if (canDrag && cIdx < stack.length - 1) {
                                for (let k = cIdx; k < stack.length - 1; k++) {
                                    if (stack[k].cat !== stack[k + 1].cat || !stack[k + 1].isRevealed) {
                                        canDrag = false;
                                        break;
                                    }
                                }
                            }

                            // Step 2: only highlighted category cards are draggable
                            if (tutorialStep === 2 && !tutorialHighlightCards.has(card.id)) canDrag = false;
                            // Step 3: no stack dragging allowed
                            if (tutorialStep === 3) canDrag = false;
                            // Step 4: only 바나나(t4) is draggable
                            if (tutorialStep === 4 && !tutorialHighlightCards.has(card.id)) canDrag = false;
                            // Step 5: only 딸기(t3) is draggable
                            if (tutorialStep === 5 && !tutorialHighlightCards.has(card.id)) canDrag = false;
                            // Step 6: only group-top cards are draggable
                            if (tutorialStep === 6 && !tutorialHighlightCards.has(card.id)) canDrag = false;

                            const globalCardIndex = stackStartIndices[sIdx] + cIdx;
                            const isDealtYet = !isDealingAnimation || globalCardIndex < dealingProgress;
                            const isCurrentlyDealing = isDealingAnimation && globalCardIndex < dealingProgress;

                            return (
                                <div
                                    key={card.id}
                                    data-card-id={card.id}
                                    draggable={canDrag && !isRemoveMode}
                                    onDragStart={e => canDrag && !isRemoveMode && handleDragStart(e, 'stack', sIdx, cIdx)}
                                    onDrag={handleDragMove}
                                    onDragEnd={() => { setDragGhostPos(null); setNearestValidTarget(null); !landingGroup && setDraggingGroup(null); }}
                                    onDragOver={e => e.preventDefault()}
                                    onTouchStart={e => canDrag && !isRemoveMode && handleTouchStart(e, 'stack', sIdx, cIdx)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchCancel={handleTouchCancel}
                                    onClick={() => isRemoveMode && (card.isRevealed || (gatheringCat === card.cat)) && handleRemoveClick(card.cat)}
                                    className={[
                                        tutorialHighlightCards.has(card.id) ? 'tutorial-highlight' : '',
                                        isCurrentlyDealing ? 'deal-animation' : ''
                                    ].filter(Boolean).join(' ')}
                                    style={{
                                        ...stackCardStyle,
                                        width: `${finalCardWidth}px`,
                                        height: `${cardHeight}px`,
                                        backgroundColor: isRevealed ? (card.type === 'category' ? '#fff9f2' : '#ffffff') : 'transparent',
                                        backgroundImage: isRevealed ? 'none' : faceDownPattern,
                                        backgroundSize: isRevealed ? 'auto' : '100% 100%',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        color: isRevealed ? '#333' : 'transparent',
                                        marginBottom: cIdx === stack.length - 1 ? '0' : `${currentOverlapMargin}px`,
                                        zIndex: cIdx,
                                        padding: '5px',
                                        cursor: isRemoveMode && (card.isRevealed || gatheringCat === card.cat) ? 'pointer' : (canDrag ? 'grab' : 'default'),
                                        touchAction: canDrag && !isRemoveMode ? 'none' : 'auto',
                                        border: isRevealed
                                            ? (card.type === 'category' ? '3px solid #ff9f43' : '3px solid #999999')
                                            : 'none',
                                        boxShadow: (isRevealed && card.type === 'category') ? '0 0 10px rgba(255,159,67,0.2)' : 'none',
                                        visibility: (isGatheringTarget || (draggingGroup?.type === 'stack' && draggingGroup.index === sIdx && draggingGroup.cardIndex !== undefined && cIdx >= draggingGroup.cardIndex && cIdx < draggingGroup.cardIndex + (draggingGroup.count || 1)) || (landingGroup?.isProxy && landingGroup.movingCards?.some((mc: any) => mc.id === card.id)) || !isDealtYet) ? 'hidden' : 'visible',
                                    } as any}
                                >
                                    {!card.isRevealed && gatheringCat === card.cat && (
                                        <div className="reveal-overlay" style={{ backgroundImage: faceDownPattern, backgroundSize: '100% 100%' } as any} />
                                    )}
                                    {isRevealed && (
                                        <>
                                            <div style={{
                                                position: 'absolute',
                                                inset: '2px',
                                                border: card.type === 'category' ? '1px solid #ffba75' : '1px solid #777777',
                                                borderRadius: '3px',
                                                pointerEvents: 'none',
                                                zIndex: 1
                                            }} />
                                            <div style={{
                                                height: '100%',
                                                width: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: (cIdx === stack.length - 1 || isGatheringTarget) ? 'center' : 'flex-start',
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
            })}
        </div>
    );
};

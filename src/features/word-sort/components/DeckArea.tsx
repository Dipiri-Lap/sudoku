import React from 'react';
import { RotateCcw, Crown } from 'lucide-react';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';
import { WordSortAnimations } from '../styles/WordSortAnimations';

export const DeckArea: React.FC = () => {
    const { state } = useWordSort();
    const {
        finalCardWidth,
        slotCardStyle,
        faceDownPattern,
        cardTextSize,
        draggingGroup,
        setDraggingGroup,
        setDragGhostPos,
        setNearestValidTarget,
        landingGroup,
        handleDragStart,
        handleDragMove,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
        tutorialStep,
        tutorialHighlightCards,
        tutorialHighlightDeck,
        gatheringCat,
        gatherPhase,
        gatherOffsets,
        isRemoveMode,
        handleRemoveClick,
        lastDrawnId,
        deckCardRef,
        drawDeck,
        splitText,
        setShowMoveConfirm,
        coins,
    } = useWordSortUI();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: `${Math.max(95, finalCardWidth)}px auto`, gap: '12px', marginBottom: '1.5rem', alignItems: 'center' }}>
            {/* Steps counter */}
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '85px' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>남은 횟수</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>{state.stepsLeft}</div>
                {!state.isStepsPurchased && tutorialStep === null && (
                    <button
                        onClick={() => setShowMoveConfirm(true)}
                        style={{
                            marginTop: '6px',
                            padding: '4px 8px',
                            borderRadius: '20px',
                            border: 'none',
                            background: coins >= 50 ? 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' : '#555',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            cursor: coins >= 50 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        +20 (🪙50)
                    </button>
                )}
            </div>

            {/* Revealed deck + draw button */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', position: 'relative' }}>
                <WordSortAnimations />
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    position: 'absolute',
                    right: `${finalCardWidth + 12}px`,
                    top: 0,
                    width: `${finalCardWidth + 84}px`,
                    minHeight: '80px',
                    perspective: gatheringCat ? 'none' : '1200px',
                    zIndex: gatheringCat ? 6000 : 10
                }}>
                    {(state.revealedDeck.length === 0 || (state.revealedDeck.length === 1 && draggingGroup?.type === 'deck')) && (
                        <div style={{ ...slotCardStyle, width: `${finalCardWidth}px`, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', position: 'absolute', right: 0 }}>
                            <div style={{ opacity: 0.2, fontSize: '0.7rem' }}>카드 없음</div>
                        </div>
                    )}
                    {(() => {
                        const last4 = state.revealedDeck.slice(-4);
                        const renderCards = last4.map((c, i) => ({ card: c, idx: i, isTop: i === last4.length - 1 }));

                        return renderCards.map(({ card, idx, isTop }) => {
                            const isGathering = gatherOffsets.current.has(card.id);
                            const category = state.categories.find(c => c.id === card.cat);
                            const offsetGap = 28;
                            const offset = idx * offsetGap;

                            return (
                                <div
                                    key={card.id}
                                    data-card-id={card.id}
                                    draggable={isTop && tutorialStep !== 2 && tutorialStep !== 4 && tutorialStep !== 5 && tutorialStep !== 6}
                                    onDragStart={(e) => isTop && handleDragStart(e, 'deck', 0)}
                                    onDrag={handleDragMove}
                                    onDragEnd={() => { setDragGhostPos(null); setNearestValidTarget(null); !landingGroup && setDraggingGroup(null); }}
                                    onTouchStart={(e) => { const canTouchDrag = isTop && tutorialStep !== 2 && tutorialStep !== 4 && tutorialStep !== 5 && tutorialStep !== 6; canTouchDrag && handleTouchStart(e, 'deck', 0); }}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchCancel={handleTouchCancel}
                                    className={[
                                        card.id === lastDrawnId ? 'animate-card-draw' : '',
                                        isTop && tutorialHighlightCards.has(card.id) ? 'tutorial-highlight' : ''
                                    ].filter(Boolean).join(' ')}
                                    style={{
                                        ...slotCardStyle,
                                        position: 'absolute',
                                        right: `${offset}px`,
                                        zIndex: isTop ? 50 : idx,
                                        width: `${finalCardWidth}px`,
                                        backgroundColor: card.isRevealed ? (card.type === 'category' ? '#fff9f2' : '#ffffff') : 'transparent',
                                        backgroundImage: card.isRevealed ? 'none' : faceDownPattern,
                                        backgroundSize: card.isRevealed ? 'auto' : '100% 100%',
                                        border: card.isRevealed ? (card.type === 'category' ? '3px solid #ff9f43' : '3px solid #999999') : 'none',
                                        boxShadow: (card.isRevealed && card.type === 'category') ? '0 0 15px rgba(255,159,67,0.3)' : '0 2px 5px rgba(0,0,0,0.1)',
                                        visibility: ((isGathering && (gatherOffsets.current.get(card.id)?.seq ?? 0) <= gatherPhase) || (isTop && draggingGroup?.type === 'deck') || (landingGroup?.isProxy && landingGroup.movingCards?.some((mc: any) => mc.id === card.id))) ? 'hidden' : 'visible',
                                        cursor: isRemoveMode ? 'pointer' : (isTop ? 'grab' : 'default'),
                                        touchAction: isTop && !isRemoveMode ? 'none' : 'auto',
                                        color: card.isRevealed ? '#333' : 'transparent',
                                        padding: isTop ? '5px' : '0',
                                        transformOrigin: 'center',
                                        '--startX': `${finalCardWidth + 12 + offset}px`,
                                    } as any}
                                    onClick={() => isRemoveMode && (card.isRevealed || (gatheringCat === card.cat)) && handleRemoveClick(card.cat)}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        inset: '2px',
                                        border: card.type === 'category' ? '1px solid #ffba75' : '1px solid #777777',
                                        borderRadius: '3px',
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }} />

                                    {isTop && card.type === 'category' && (
                                        <>
                                            <div style={{ position: 'absolute', top: '4px', left: '6px', color: '#ff9f43', fontSize: '0.65rem', fontWeight: '900', zIndex: 2 }}>
                                                0/{category?.words?.length ?? 5}
                                            </div>
                                            <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43', zIndex: 2 }}>
                                                <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                            </div>
                                        </>
                                    )}
                                    <div style={{
                                        height: '100%',
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        position: 'relative'
                                    }}>
                                        <span style={{
                                            fontWeight: '900',
                                            fontSize: `${cardTextSize}rem`,
                                            lineHeight: '1.2',
                                            zIndex: 2,
                                            ...(!isTop ? {
                                                writingMode: 'vertical-rl',
                                                textOrientation: 'upright',
                                                position: 'absolute',
                                                right: '4px',
                                                letterSpacing: '-2px',
                                                color: '#666'
                                            } : { textAlign: 'center', whiteSpace: 'nowrap' })
                                        }}>
                                            {isTop ? splitText(card.value) : card.value}
                                        </span>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Draw button */}
                <div onClick={drawDeck} style={{ position: 'relative', cursor: 'pointer' }}>
                    <div
                        ref={deckCardRef}
                        className={tutorialHighlightDeck ? 'tutorial-highlight' : ''}
                        style={{
                            ...slotCardStyle,
                            width: `${finalCardWidth}px`,
                            backgroundColor: state.deck.length > 0 ? 'transparent' : 'rgba(255,255,255,0.05)',
                            backgroundImage: state.deck.length > 0 ? faceDownPattern : 'none',
                            backgroundSize: state.deck.length > 0 ? '100% 100%' : 'auto',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            border: state.deck.length > 0 ? 'none' : '1px dashed rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                        {state.deck.length > 0 ? (
                            <span style={{
                                position: 'absolute',
                                bottom: '5px',
                                right: '5px',
                                color: 'white',
                                zIndex: 2,
                                textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000'
                            }}>{state.deck.length}</span>
                        ) : state.revealedDeck.length > 0 ? (
                            <RotateCcw size={20} color="white" style={{ opacity: 0.6 }} />
                        ) : null}
                    </div>
                </div>

            </div>
        </div>
    );
};

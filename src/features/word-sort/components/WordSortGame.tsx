import React, { useEffect, useState } from 'react';
import { useWordSort, type Card } from '../context/WordSortContext';
import levels from '../data/levels.json';
import { RotateCcw, Undo2, Ban, Search, Settings, Layers as LayersIcon, Crown } from 'lucide-react';

const WordSortGame: React.FC = () => {
    const { state, dispatch } = useWordSort();
    const [draggingGroup, setDraggingGroup] = useState<{ type: 'stack' | 'deck'; index: number; cardIndex?: number } | null>(null);

    useEffect(() => {
        if (levels && levels.length > 0) {
            dispatch({ type: 'START_LEVEL', levelData: levels[0] });
        }
    }, [dispatch]);

    const handleDragStart = (e: React.DragEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => {
        const target = e.currentTarget as HTMLElement;
        e.dataTransfer.setData('text/plain', '');

        // Logical "Movable Unit" Start Index
        let effectiveCardIndex = cardIndex;

        if (type === 'stack' && cardIndex !== undefined) {
            const stack = state.stacks[index];
            // Find the bottom-most card that can be part of this group (all cards from it to the end share same cat)
            let movableStartIndex = cardIndex;
            for (let i = cardIndex - 1; i >= 0; i--) {
                if (stack[i].cat === stack[cardIndex].cat && stack[i].isRevealed) {
                    movableStartIndex = i;
                } else {
                    break;
                }
            }
            effectiveCardIndex = movableStartIndex;

            const stackContainer = target.parentElement;
            if (stackContainer) {
                const ghost = document.createElement('div');
                ghost.style.width = `${target.offsetWidth}px`;
                ghost.style.position = 'absolute';
                ghost.style.top = '-2000px';
                ghost.style.left = '-2000px';
                ghost.style.display = 'flex';
                ghost.style.flexDirection = 'column';
                ghost.style.pointerEvents = 'none';

                const siblings = Array.from(stackContainer.children);
                const cardsToClone = siblings.slice(effectiveCardIndex);

                cardsToClone.forEach((node, idx) => {
                    const clone = node.cloneNode(true) as HTMLElement;
                    clone.style.visibility = 'visible';
                    clone.style.opacity = '1';
                    clone.style.transform = 'none';

                    // Add badge to the visually top-most card of the dragging group
                    if (idx === 0 && cardsToClone.length > 1) {
                        const badge = document.createElement('div');
                        badge.innerText = `${cardsToClone.length}`;
                        badge.style.position = 'absolute';
                        badge.style.top = '-10px';
                        badge.style.left = '-10px';
                        badge.style.background = '#e74c3c';
                        badge.style.color = 'white';
                        badge.style.borderRadius = '50%';
                        badge.style.width = '24px';
                        badge.style.height = '24px';
                        badge.style.fontSize = '0.75rem';
                        badge.style.display = 'flex';
                        badge.style.alignItems = 'center';
                        badge.style.justifyContent = 'center';
                        badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                        badge.style.zIndex = '1000';
                        badge.style.fontWeight = 'bold';
                        clone.appendChild(badge);
                    }
                    ghost.appendChild(clone);
                });

                document.body.appendChild(ghost);

                // Calculate vertical offset so mouse points to exactly where user grabbed
                // The gap between cards is approx 15% of height (since margin is -85%)
                const cardHeight = target.offsetHeight;
                const overlapShift = cardHeight * 0.15; // 100% - 85%
                const yOffsetInGhost = (cardIndex - effectiveCardIndex) * overlapShift + e.nativeEvent.offsetY;

                e.dataTransfer.setDragImage(ghost, target.offsetWidth / 2, yOffsetInGhost);

                setTimeout(() => {
                    if (ghost.parentNode) document.body.removeChild(ghost);
                }, 0);
            }
        }

        setTimeout(() => {
            setDraggingGroup({ type, index, cardIndex: effectiveCardIndex });
        }, 0);
    };

    const handleDrop = (e: React.DragEvent, target: { type: 'slot' | 'stack'; index: number }) => {
        e.preventDefault();
        if (draggingGroup) {
            dispatch({ type: 'MOVE_CARD', from: draggingGroup, to: target });
            setDraggingGroup(null);
        }
    };

    const drawDeck = () => {
        dispatch({ type: 'DRAW_DECK' });
    };

    const cardBaseStyle: React.CSSProperties = {
        width: '100%',
        aspectRatio: '2 / 2.8',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        position: 'relative',
        transition: 'transform 0.1s ease',
        border: '1px solid rgba(0,0,0,0.1)',
        padding: '5px',
        background: 'white',
        color: '#333'
    };

    const slotCardStyle: React.CSSProperties = {
        ...cardBaseStyle,
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        fontSize: '0.9rem',
    };

    const stackCardStyle: React.CSSProperties = {
        ...cardBaseStyle,
        fontSize: '0.9rem',
    };

    const faceDownPattern = `repeating-linear-gradient(
        45deg,
        #ff9f43 0px,
        #ff9f43 10px,
        #ee5253 10px,
        #ee5253 20px
    )`;

    // Dynamic card width calculation: starts at 95px for 3 stacks, 
    // and decreases as stack count increases to maintain layout.
    const stackCount = state.stacks.length;
    const containerMaxWidth = 360; // Base container width
    const gap = 12;
    const cardWidth = Math.floor((containerMaxWidth - (stackCount - 1) * gap) / stackCount);
    // Keep a reasonable minimum and maximum
    const finalCardWidth = Math.max(60, Math.min(95, cardWidth));

    return (
        <div className="word-solitaire-game" style={{
            padding: '1rem',
            color: 'white',
            background: '#5c5e7e',
            minHeight: '100vh',
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
            overflow: 'hidden'
        }}>
            {/* Top Bar */}
            <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 'bold' }}>레벨 {state.level}</h2>
                <Settings size={24} style={{ position: 'absolute', right: 0, opacity: 0.7 }} />
            </header>

            {/* Stats area */}
            <div style={{ display: 'grid', gridTemplateColumns: '85px 120px 1fr 100px', gap: '8px', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>걸음 수</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>{state.stepsLeft}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                    <Ban size={20} />
                </div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                    {state.revealedDeck.length > 0 ? (
                        (() => {
                            const topCard = state.revealedDeck[state.revealedDeck.length - 1];
                            const isDragging = draggingGroup?.type === 'deck';
                            return (
                                <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'deck', 0)}
                                    onDragEnd={() => setDraggingGroup(null)}
                                    style={{
                                        ...slotCardStyle,
                                        width: `${finalCardWidth}px`,
                                        background: topCard.type === 'category' ? '#fff9f2' : 'white',
                                        border: topCard.type === 'category' ? '3px solid #ff9f43' : '1px solid #ddd',
                                        boxShadow: topCard.type === 'category' ? '0 0 15px rgba(255,159,67,0.3)' : 'none',
                                        visibility: isDragging ? 'hidden' : 'visible',
                                        cursor: 'grab',
                                        color: '#333'
                                    }}
                                >
                                    {topCard.type === 'category' && (
                                        <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43' }}>
                                            <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                        </div>
                                    )}
                                    <span style={{ fontWeight: topCard.type === 'category' ? '900' : 'normal' }}>
                                        {topCard.value}
                                    </span>
                                </div>
                            );
                        })()
                    ) : (
                        <div style={{ ...slotCardStyle, width: `${finalCardWidth}px`, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <div style={{ opacity: 0.2, fontSize: '0.7rem' }}>카드 없음</div>
                        </div>
                    )}
                </div>
                <div onClick={drawDeck} style={{ position: 'relative', cursor: 'pointer', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                        ...slotCardStyle,
                        width: `${finalCardWidth}px`,
                        background: state.deck.length > 0 ? faceDownPattern : 'rgba(255,255,255,0.05)',
                        border: state.deck.length > 0 ? '2px solid white' : '1px dashed rgba(255,255,255,0.1)'
                    }}>
                        {state.deck.length > 0 && <span style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white' }}>{state.deck.length}</span>}
                    </div>
                </div>
            </div>

            {/* Slots */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(3, ${finalCardWidth}px)`,
                gap: `${gap}px`,
                marginBottom: '1.5rem',
                maxWidth: 'fit-content',
                marginInline: 'auto'
            }}>
                {Object.keys(state.activeSlots).map(key => {
                    const i = parseInt(key);
                    const slot = state.activeSlots[i];
                    return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {/* Integrated Label Header */}
                            {slot && (
                                <div style={{
                                    background: '#ff9f43',
                                    padding: '2px 8px',
                                    borderTopLeftRadius: '6px',
                                    borderTopRightRadius: '6px',
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    color: '#3e2723',
                                    alignSelf: 'center',
                                    marginBottom: '-4px',
                                    zIndex: 1,
                                    boxShadow: '0 -2px 5px rgba(0,0,0,0.1)',
                                    minWidth: '55px',
                                    textAlign: 'center'
                                }}>
                                    {slot.name}
                                </div>
                            )}
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDrop(e, { type: 'slot', index: i })}
                                style={{
                                    ...slotCardStyle,
                                    background: slot ? 'white' : 'rgba(255,255,255,0.05)',
                                    color: '#333',
                                    border: slot ? '3.5px solid #ff9f43' : '1px dashed rgba(255,255,255,0.1)',
                                    opacity: slot ? 1 : 0.5,
                                    width: `${finalCardWidth}px`,
                                    boxShadow: slot ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {slot ? (
                                    <>
                                        <div style={{ position: 'absolute', top: '6px', left: '8px', fontSize: '0.75rem', color: '#a0522d', fontWeight: 'bold' }}>
                                            {slot.collected.length}/{slot.target}
                                        </div>
                                        <div style={{ position: 'absolute', top: '6px', right: '8px', color: '#ff9f43' }}>
                                            <Crown size={16} fill="#ff9f43" fillOpacity={0.3} strokeWidth={2.5} />
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#2c3e50', marginTop: '10px' }}>
                                            {slot.collected.length > 0 ? slot.collected[slot.collected.length - 1] : slot.name}
                                        </div>
                                    </>
                                ) : (
                                    <Ban size={20} style={{ opacity: 0.1 }} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Play Stacks Area */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${state.stacks.length}, ${finalCardWidth}px)`,
                gap: `${gap}px`,
                flex: 1,
                alignItems: 'flex-start',
                maxWidth: 'fit-content',
                marginInline: 'auto'
            }}>
                {state.stacks.map((stack, sIdx) => (
                    <div
                        key={sIdx}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, { type: 'stack', index: sIdx })}
                        style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '150px' }}
                    >
                        {stack.length === 0 && (
                            <div style={{ ...stackCardStyle, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }} />
                        )}
                        {stack.map((card, cIdx) => {
                            const isRevealed = !!card.isRevealed;

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

                            const isDragging = draggingGroup?.type === 'stack' &&
                                draggingGroup.index === sIdx &&
                                draggingGroup.cardIndex !== undefined &&
                                cIdx >= draggingGroup.cardIndex;

                            return (
                                <div
                                    key={cIdx}
                                    draggable={canDrag}
                                    onDragStart={e => canDrag && handleDragStart(e, 'stack', sIdx, cIdx)}
                                    onDragEnd={() => setDraggingGroup(null)}
                                    style={{
                                        ...stackCardStyle,
                                        background: isRevealed
                                            ? (card.type === 'category' ? '#fff9f2' : 'white')
                                            : faceDownPattern,
                                        color: isRevealed ? '#333' : 'transparent',
                                        marginBottom: cIdx === stack.length - 1 ? '0' : '-85%',
                                        zIndex: cIdx,
                                        cursor: canDrag ? 'grab' : 'default',
                                        border: isRevealed
                                            ? (card.type === 'category' ? '3px solid #ff9f43' : '1px solid #ddd')
                                            : '1px solid rgba(0,0,0,0.2)',
                                        boxShadow: (isRevealed && card.type === 'category') ? '0 0 10px rgba(255,159,67,0.2)' : 'none',
                                        visibility: isDragging ? 'hidden' : 'visible'
                                    }}
                                >
                                    {isRevealed && (
                                        <>
                                            {card.type === 'category' && (
                                                <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43' }}>
                                                    <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                                </div>
                                            )}
                                            <span style={{ fontWeight: card.type === 'category' ? '900' : 'normal' }}>
                                                {card.value}
                                            </span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Bottom Menu */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '1.5rem 0.5rem',
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ textAlign: 'center' }}><Search size={24} /><div style={{ fontSize: '0.7rem' }}>힌트</div></div>
                <div style={{ textAlign: 'center' }}><Undo2 size={24} /><div style={{ fontSize: '0.7rem' }}>철회</div></div>
                <div style={{ textAlign: 'center' }}><RotateCcw size={24} onClick={() => dispatch({ type: 'START_LEVEL', levelData: levels[0] })} /><div style={{ fontSize: '0.7rem' }}>재시작</div></div>
                <div style={{ textAlign: 'center' }}><LayersIcon size={24} /><div style={{ fontSize: '0.7rem' }}>제거</div></div>
            </div>

            {/* Win Overlay */}
            {state.isWinner && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <h2 style={{ fontSize: '2.5rem', color: '#f1c40f', marginBottom: '1.5rem' }}>🎉 VICTORY!</h2>
                    <button onClick={() => dispatch({ type: 'START_LEVEL', levelData: levels[0] })} style={{ padding: '0.8rem 2.5rem', fontSize: '1.2rem', borderRadius: '30px', border: 'none', background: '#f39c12', color: 'white', fontWeight: 'bold' }}>재시작</button>
                </div>
            )}
        </div>
    );
};

export default WordSortGame;

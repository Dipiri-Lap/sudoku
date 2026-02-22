import React, { useEffect, useState } from 'react';
import { useWordSort, type Card } from '../context/WordSortContext';
import levels from '../data/levels.json';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Undo2, Ban, Search, Settings, Layers as LayersIcon } from 'lucide-react';

const WordSortGame: React.FC = () => {
    const { state, dispatch } = useWordSort();
    const navigate = useNavigate();
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
                if (stack[i].cat === stack[cardIndex].cat) {
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

                cardsToClone.forEach((node) => {
                    const clone = node.cloneNode(true) as HTMLElement;
                    clone.style.visibility = 'visible';
                    clone.style.opacity = '1';
                    clone.style.transform = 'none';
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
        fontSize: '0.85rem',
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

    const faceDownPattern = `repeating-linear-gradient(
        45deg,
        #ff9f43 0px,
        #ff9f43 10px,
        #ee5253 10px,
        #ee5253 20px
    )`;

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
                    <div style={{ ...cardBaseStyle, width: '70px' }}>음학</div>
                </div>
                <div onClick={drawDeck} style={{ position: 'relative', cursor: 'pointer', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ ...cardBaseStyle, width: '75px', background: faceDownPattern, border: '2px solid white' }}>
                        <span style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white' }}>{state.deck.length}</span>
                    </div>
                </div>
            </div>

            {/* Slots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '1.5rem' }}>
                {Object.keys(state.activeSlots).map(key => {
                    const i = parseInt(key);
                    const slot = state.activeSlots[i];
                    return (
                        <div
                            key={i}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDrop(e, { type: 'slot', index: i })}
                            style={{
                                ...cardBaseStyle,
                                background: slot ? 'white' : 'rgba(255,255,255,0.05)',
                                color: '#333',
                                border: slot ? '2px solid #f39c12' : '1px solid rgba(255,255,255,0.1)',
                                opacity: slot ? 1 : 0.5
                            }}
                        >
                            {slot ? (
                                <>
                                    <div style={{ position: 'absolute', top: '2px', left: '5px', fontSize: '0.6rem', color: '#e67300', fontWeight: 'bold' }}>
                                        {slot.collected.length}/{slot.target}
                                    </div>
                                    {slot.name}
                                </>
                            ) : <Ban size={18} style={{ opacity: 0.1 }} />}
                        </div>
                    );
                })}
            </div>

            {/* Play Stacks Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', flex: 1, alignItems: 'flex-start' }}>
                {state.stacks.map((stack, sIdx) => (
                    <div
                        key={sIdx}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, { type: 'stack', index: sIdx })}
                        style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '150px' }}
                    >
                        {stack.length === 0 && (
                            <div style={{ ...cardBaseStyle, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }} />
                        )}
                        {stack.map((card, cIdx) => {
                            const isRevealed = cIdx === stack.length - 1 || card.type === 'word';

                            // Drag evaluation: can drag if all cards ABOVE it match the target category
                            let canDrag = true;
                            if (cIdx < stack.length - 1) {
                                for (let k = cIdx; k < stack.length - 1; k++) {
                                    if (stack[k].cat !== stack[k + 1].cat) {
                                        canDrag = false;
                                        break;
                                    }
                                }
                            }

                            // Visual count if it's a group
                            let groupDisplayCount = 0;
                            if (canDrag) {
                                // Find how many same-category cards are BELOW this one to form the whole unit
                                let unitStart = cIdx;
                                for (let i = cIdx - 1; i >= 0; i--) {
                                    if (stack[i].cat === card.cat) unitStart = i;
                                    else break;
                                }
                                groupDisplayCount = stack.length - unitStart;
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
                                        ...cardBaseStyle,
                                        background: isRevealed ? 'white' : faceDownPattern,
                                        color: isRevealed ? '#333' : 'transparent',
                                        marginBottom: cIdx === stack.length - 1 ? '0' : '-85%',
                                        zIndex: cIdx,
                                        cursor: canDrag ? 'grab' : 'default',
                                        border: isRevealed ? '1px solid #ddd' : '1px solid rgba(0,0,0,0.2)',
                                        visibility: isDragging ? 'hidden' : 'visible'
                                    }}
                                >
                                    {isRevealed && <span>{card.value}</span>}

                                    {/* Show count badge on EVERY card in the group if it's being hovered/grabbed, 
                                        but for simplicity we just show it if it is a valid unit. */}
                                    {canDrag && groupDisplayCount > 1 && !isDragging && (
                                        <div style={{
                                            position: 'absolute', top: '-10px', left: '-10px',
                                            background: '#e74c3c', color: 'white', borderRadius: '50%',
                                            width: '20px', height: '20px', fontSize: '0.7rem',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 100
                                        }}>
                                            {groupDisplayCount}
                                        </div>
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

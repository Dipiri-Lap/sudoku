import React, { useEffect, useState, useRef } from 'react';
import { useWordSort } from '../context/WordSortContext';
import levels from '../data/levels.json';
import { RotateCcw, Undo2, Search, Layers as LayersIcon, Crown, Sparkles } from 'lucide-react';

// This function is assumed to be moved from WordSortContext.tsx based on the instruction.
// The instruction mentions "WordSortContext의 updateStateAfterMove 함수 인자 타입을 수정하여 린트 오류를 해결합니다."
// However, the provided code snippet for the change seems to be trying to insert this function
// into WordSortGame.tsx, which would be incorrect.
// Given the instruction, I will assume the user intended to provide the *correct* type signature
// for updateStateAfterMove, and that this function belongs in WordSortContext.tsx, not here.
// Since I only have WordSortGame.tsx, I cannot modify WordSortContext.tsx.
// I will proceed by removing the malformed line from WordSortGame.tsx as implied by the diff,
// and assume the user will apply the updateStateAfterMove change to the correct file.

const WordSortGame: React.FC = () => {

    const { state, dispatch } = useWordSort();

    // Dynamic card width calculation: starts at 95px for 3 stacks, 
    // and decreases as stack count increases to maintain layout.
    const stackCount = state.stacks.length;
    const containerMaxWidth = 288; // Base container width (Reduced from 360)
    const gap = 10; // Reduced from 12
    const cardWidth = Math.floor((containerMaxWidth - (stackCount - 1) * gap) / stackCount);
    // Keep a reasonable minimum and maximum (Reduced by 20%)
    const finalCardWidth = Math.max(48, Math.min(76, cardWidth));
    const cardHeight = finalCardWidth * 1.4;
    const visibleHeight = 22; // Height of the visible strip for overlapped cards
    const overlapMargin = -(cardHeight - visibleHeight);

    const [draggingGroup, setDraggingGroup] = useState<{ type: 'stack' | 'deck'; index: number; cardIndex?: number; count?: number } | null>(null);
    const [landingGroup, setLandingGroup] = useState<{ targetIds: string[]; offsetX: number; offsetY: number; animating?: boolean } | null>(null);
    const [lastDrawnId, setLastDrawnId] = useState<string | null>(null);
    const [prevRevealedCount, setPrevRevealedCount] = useState(0);

    const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
    const stackRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Trigger animation shortly after landing state is set
    useEffect(() => {
        if (landingGroup && !landingGroup.animating) {
            const timer = setTimeout(() => {
                setLandingGroup(prev => prev ? { ...prev, animating: true } : null);
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [landingGroup?.targetIds, landingGroup?.animating]);

    // Synchronous calibration check to prevent "target location" flash
    if (state.revealedDeck.length > prevRevealedCount) {
        setLastDrawnId(state.revealedDeck[state.revealedDeck.length - 1].id);
        setPrevRevealedCount(state.revealedDeck.length);
    } else if (state.revealedDeck.length < prevRevealedCount) {
        setPrevRevealedCount(state.revealedDeck.length);
    }

    useEffect(() => {
        if (levels && levels.length > 0) {
            dispatch({ type: 'START_LEVEL', levelData: levels[0] });
        }
    }, [dispatch]);

    const handleDragStart = (e: React.DragEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => {
        const target = e.currentTarget as HTMLElement;
        e.dataTransfer.setData('text/plain', '');

        // Logical "Movable Unit" Start Index and Count
        let effectiveCardIndex = cardIndex;
        let count = 1;

        if (type === 'stack' && cardIndex !== undefined) {
            const stack = state.stacks[index];
            const clickedCard = stack[cardIndex];

            // 1. 클릭한 카드의 카테고리 기점(Base) 탐색
            let baseIndex = cardIndex;
            for (let i = cardIndex; i >= 0; i--) {
                if (stack[i].cat === clickedCard.cat && stack[i].isRevealed) {
                    baseIndex = i;
                    if (stack[i].type === 'category') break;
                } else {
                    break;
                }
            }

            // 2. 드래그 범위 결정
            if (clickedCard.type === 'category') {
                // 기반 카드 클릭 시: 기반 카드 단독 이동
                effectiveCardIndex = cardIndex;
                count = 1;
            } else {
                // 단어 카드 클릭 시: 기반 카드(baseIndex)부터 스택 끝까지 묶어서 이동
                effectiveCardIndex = baseIndex;
                count = stack.length - baseIndex;
            }
        }

        if ((type === 'stack' && cardIndex !== undefined) || type === 'deck') {
            const container = (type === 'stack') ? target.parentElement : target.parentElement;
            if (container) {
                const ghost = document.createElement('div');
                ghost.style.width = `${target.offsetWidth}px`;
                ghost.style.position = 'absolute';
                ghost.style.top = '-2000px';
                ghost.style.left = '-2000px';
                ghost.style.display = 'flex';
                ghost.style.flexDirection = 'column';
                ghost.style.pointerEvents = 'none';

                let cardsToClone: Element[] = [];
                if (type === 'stack') {
                    const siblings = Array.from(container.children);
                    cardsToClone = siblings.slice(effectiveCardIndex, (effectiveCardIndex || 0) + count);
                } else {
                    cardsToClone = [target];
                }

                cardsToClone.forEach((node, idx) => {
                    const clone = node.cloneNode(true) as HTMLElement;
                    clone.style.visibility = 'visible';
                    clone.style.opacity = '1';
                    clone.style.transform = 'none';
                    clone.style.animation = 'none'; // 애니메이션 제거

                    // 드래그 시 뒷면 제거 로직
                    const backLayer = clone.querySelector('.drag-back-layer');
                    if (backLayer) backLayer.remove();

                    // 실제 보드와 유사하게 중첩(Overlap) 효과 재현 (스택일 때만)
                    if (type === 'stack') {
                        clone.style.marginBottom = idx === cardsToClone.length - 1 ? '0' : `${overlapMargin}px`;
                    }
                    clone.style.zIndex = `${idx}`;

                    // 선명한 녹색 테두리 추가
                    clone.style.border = '2.5px solid #2ecc71';
                    clone.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';

                    // 배지 표시 로직 (두 장 이상일 때 가장 '상단' 카드에 표시)
                    if (idx === cardsToClone.length - 1 && cardsToClone.length > 1) {
                        const badge = document.createElement('div');
                        badge.innerText = `${cardsToClone.length}`;
                        badge.style.position = 'absolute';
                        badge.style.top = '-12px';
                        badge.style.left = '-12px';
                        badge.style.background = '#e74c3c';
                        badge.style.color = 'white';
                        badge.style.borderRadius = '50%';
                        badge.style.width = '32px';
                        badge.style.height = '32px';
                        badge.style.fontSize = '1.1rem';
                        badge.style.display = 'flex';
                        badge.style.alignItems = 'center';
                        badge.style.justifyContent = 'center';
                        badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
                        badge.style.zIndex = '2000';
                        badge.style.fontWeight = '900';
                        badge.style.border = '2px solid white';
                        clone.appendChild(badge);
                    }
                    ghost.appendChild(clone);
                });

                document.body.appendChild(ghost);

                // 마우스 포인트 위치 계산
                if (type === 'stack') {
                    const overlapShift = visibleHeight;
                    const yOffsetInGhost = ((cardIndex || 0) - (effectiveCardIndex || 0)) * overlapShift + e.nativeEvent.offsetY;
                    e.dataTransfer.setDragImage(ghost, target.offsetWidth / 2, yOffsetInGhost);
                } else {
                    e.dataTransfer.setDragImage(ghost, target.offsetWidth / 2, target.offsetHeight / 2);
                }

                setTimeout(() => {
                    if (ghost.parentNode) document.body.removeChild(ghost);
                }, 100);
            }
        }

        setTimeout(() => {
            setDraggingGroup({ type, index, cardIndex: effectiveCardIndex, count });
        }, 0);
    };

    const handleDrop = (e: React.DragEvent, target: { type: 'slot' | 'stack'; index: number }) => {
        e.preventDefault();
        if (draggingGroup) {
            // Get the card(s) being moved for compatibility and position calculation
            const movingCards = draggingGroup.type === 'deck'
                ? [state.revealedDeck[state.revealedDeck.length - 1]]
                : state.stacks[draggingGroup.index].slice(draggingGroup.cardIndex);

            if (!movingCards.length) return;
            const topMovingCard = movingCards[0];

            // COMPATIBILITY CHECK: Only animate if the move will succeed AND it's a different location
            const isSameSource = draggingGroup.type === target.type && draggingGroup.index === target.index;

            let isCompatible = false;
            if (!isSameSource) {
                if (target.type === 'slot') {
                    const slot = state.activeSlots[target.index];
                    if (topMovingCard.type === 'category') {
                        isCompatible = movingCards.length === 1 && slot === null;
                    } else if (topMovingCard.type === 'word') {
                        isCompatible = slot !== null && movingCards.every(c => c.cat === slot.catId);
                    }
                } else if (target.type === 'stack') {
                    const targetStack = state.stacks[target.index];
                    if (targetStack.length === 0) {
                        isCompatible = true;
                    } else {
                        const topTarget = targetStack[targetStack.length - 1];
                        isCompatible = topTarget.type !== 'category' && topTarget.cat === topMovingCard.cat;
                    }
                }
            }

            if (isCompatible) {
                // Calculate PRECISE target container position for relative offset
                const containerRef = target.type === 'slot' ? slotRefs.current[target.index] : stackRefs.current[target.index];
                if (containerRef) {
                    const rect = containerRef.getBoundingClientRect();
                    let targetCenterX = rect.left + finalCardWidth / 2;
                    let targetCenterY = 0;

                    if (target.type === 'slot') {
                        // Slot cards are vertically centered in their 22px tab + card area
                        // The actual card div is below the 22px tab
                        targetCenterY = rect.top + 22 + cardHeight / 2;
                    } else {
                        // Stack cards are at top: (sum of previous visibleHeights)
                        const targetStack = state.stacks[target.index];
                        const nextIndex = targetStack.length;
                        const numToCompress = Math.max(0, (nextIndex + movingCards.length) - 8);

                        let topOffset = 0;
                        for (let i = 0; i < nextIndex; i++) {
                            const isFaceDown = !targetStack[i].isRevealed;
                            topOffset += (i < numToCompress && isFaceDown) ? 11 : 22;
                        }
                        targetCenterY = rect.top + topOffset + cardHeight / 2;
                    }

                    setLandingGroup({
                        targetIds: movingCards.map(c => c.id),
                        offsetX: e.clientX - targetCenterX,
                        offsetY: e.clientY - targetCenterY
                    });
                }

                // Reset landing animation after it finishes
                setTimeout(() => setLandingGroup(null), 400);
            }

            dispatch({
                type: 'MOVE_CARD',
                from: {
                    type: draggingGroup.type,
                    index: draggingGroup.index,
                    cardIndex: draggingGroup.cardIndex,
                    count: draggingGroup.count
                },
                to: target
            });
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
        alignItems: 'center', // 기본값
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
        fontSize: '0.85rem',
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
            padding: '0.5rem 1rem 1rem',
            color: 'white',
            background: '#5c5e7e',
            minHeight: '100vh',
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
            overflow: 'hidden'
        }}>

            {/* Stats area (Steps & Deck) */}
            <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr auto', gap: '12px', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>걸음 수</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>{state.stepsLeft}</div>
                </div>
                <div /> {/* Spacer */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <style>{`
                     @keyframes flipAndMove {
                        0% { 
                            transform: translateX(var(--startX, 150px)) rotateY(180deg); 
                            opacity: 1; 
                            z-index: 100;
                        }
                        15% {
                            transform: translateX(var(--startX, 150px)) rotateY(0deg);
                            opacity: 1;
                        }
                        100% { 
                            transform: translateX(0) rotateY(0deg); 
                            opacity: 1;
                            z-index: 5;
                        }
                    }
                    .animate-card-draw {
                        animation: flipAndMove 0.6s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
                        transform-style: preserve-3d;
                        backface-visibility: hidden;
                    }
                `}</style>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                        position: 'relative',
                        width: `${finalCardWidth + 130}px`,
                        minHeight: '80px',
                        perspective: '1200px',
                        zIndex: 10
                    }}>
                        {state.revealedDeck.length > 0 ? (
                            state.revealedDeck.slice(-6).map((card, idx, arr) => {
                                const isTop = idx === arr.length - 1;
                                const isDragging = isTop && draggingGroup?.type === 'deck';
                                // 우측 기준: 가장 오래된 것(idx=0)이 right: 0, 최신 것(idx=arr.length-1)이 가장 왼쪽
                                const offsetGap = 25;
                                const offset = idx * offsetGap;
                                const category = state.categories.find(c => c.id === card.cat);

                                // 덱 위치 (슬롯 영역 우측 밖)까지의 거리 계산
                                // 슬롯 위치(offset) + 슬롯 컨테이너 여백(12px) + 덱 카드 폭(finalCardWidth)
                                // 덱 더미의 오른쪽 끝 지점으로 출발점을 잡아야 자연스러움
                                const startX = offset + finalCardWidth + 12;

                                return (
                                    <div
                                        key={card.id}
                                        draggable={isTop}
                                        onDragStart={(e) => isTop && handleDragStart(e, 'deck', 0)}
                                        onDragEnd={() => setDraggingGroup(null)}
                                        className={card.id === lastDrawnId ? 'animate-card-draw' : ''}
                                        style={{
                                            ...slotCardStyle,
                                            position: 'absolute',
                                            right: `${offset}px`,
                                            zIndex: isTop ? 50 : idx,
                                            width: `${finalCardWidth}px`,
                                            background: card.type === 'category' ? '#fff9f2' : 'white',
                                            border: card.type === 'category' ? '3px solid #ff9f43' : '1px solid #ddd',
                                            boxShadow: card.type === 'category' ? '0 0 15px rgba(255,159,67,0.3)' : '0 2px 5px rgba(0,0,0,0.1)',
                                            visibility: isDragging ? 'hidden' : 'visible',
                                            cursor: isTop ? 'grab' : 'default',
                                            color: '#333',
                                            padding: isTop ? '5px' : '0',
                                            transformOrigin: 'center',
                                            /* @ts-ignore - CSS custom property */
                                            '--startX': `${startX}px`
                                        } as React.CSSProperties}
                                    >
                                        {/* 뒷면 효과 (포물선 이동 중 뒷면이 보이도록) */}
                                        <div
                                            className="drag-back-layer"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: faceDownPattern,
                                                transform: 'rotateY(180deg)',
                                                backfaceVisibility: 'hidden',
                                                borderRadius: '8px',
                                                zIndex: -1
                                            }}
                                        />

                                        {isTop && card.type === 'category' && (
                                            <>
                                                <div style={{ position: 'absolute', top: '4px', left: '6px', color: '#ff9f43', fontSize: '0.65rem', fontWeight: '900' }}>
                                                    0/{category?.target || 5}
                                                </div>
                                                <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43' }}>
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
                                                position: isTop ? 'static' : 'absolute',
                                                right: isTop ? 'auto' : '2px', // Stay in visible stripe
                                                width: isTop ? 'auto' : `${offsetGap}px`,
                                                fontWeight: card.type === 'category' ? '900' : 'normal',
                                                writingMode: isTop ? 'horizontal-tb' : 'vertical-rl',
                                                textOrientation: 'upright',
                                                letterSpacing: isTop ? 'normal' : '2px',
                                                fontSize: isTop ? '0.9rem' : '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {card.value}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ ...slotCardStyle, width: `${finalCardWidth}px`, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.1)', position: 'absolute', right: 0 }}>
                                <div style={{ opacity: 0.2, fontSize: '0.7rem' }}>카드 없음</div>
                            </div>
                        )}
                    </div>
                    <div onClick={drawDeck} style={{ position: 'relative', cursor: 'pointer' }}>
                        <div style={{
                            ...slotCardStyle,
                            width: `${finalCardWidth}px`,
                            background: state.deck.length > 0 ? faceDownPattern : 'rgba(255,255,255,0.05)',
                            border: state.deck.length > 0 ? '2px solid white' : '1px dashed rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {state.deck.length > 0 ? (
                                <span style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white' }}>{state.deck.length}</span>
                            ) : state.revealedDeck.length > 0 ? (
                                <RotateCcw size={20} color="white" style={{ opacity: 0.6 }} />
                            ) : null}
                        </div>
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
                {[0, 1, 2].map(i => {
                    const slot = state.activeSlots[i];
                    const isLanded = landingGroup && slot && landingGroup.targetIds.includes(slot.catId);

                    return (
                        <div key={i} ref={el => { slotRefs.current[i] = el; }} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {/* Tab Area - Only spacer for alignment (No tab as per request) */}
                            <div style={{ height: '22px' }} />
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDrop(e, { type: 'slot', index: i })}
                                style={{
                                    ...slotCardStyle,
                                    background: slot ? 'white' : 'rgba(255,255,255,0.03)',
                                    color: '#333',
                                    border: slot
                                        ? '1.5px solid #ffcc80'
                                        : '1px dashed rgba(255,255,255,0.2)',
                                    opacity: 1,
                                    width: `${finalCardWidth}px`,
                                    boxShadow: slot ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: (isLanded && landingGroup)
                                        ? (landingGroup.animating ? 'none' : `translate(${landingGroup.offsetX}px, ${landingGroup.offsetY}px)`)
                                        : 'none',
                                    transition: (isLanded && landingGroup && !landingGroup.animating)
                                        ? 'none'
                                        : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)'
                                }}
                            >
                                {slot ? (
                                    <>
                                        {/* 내부 상단: '0/4 주방' 형식 및 왕관 아이콘 */}
                                        <div style={{
                                            position: 'absolute', top: '6px', left: '8px', right: '8px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <span style={{ fontSize: '0.75rem', color: '#a0522d', fontWeight: '900' }}>
                                                {slot.collected.length}/{slot.target} {slot.name}
                                            </span>
                                            <Crown size={14} fill="#ff9f43" fillOpacity={0.3} strokeWidth={2.5} style={{ color: '#ff9f43' }} />
                                        </div>
                                        {/* 중앙: 마지막 단어 */}
                                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#2c3e50', marginTop: '12px' }}>
                                            {slot.collected.length > 0 ? slot.collected[slot.collected.length - 1] : slot.name}
                                        </div>
                                    </>
                                ) : (
                                    <Sparkles size={24} style={{ opacity: 0.1, color: 'white' }} />
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
                        ref={el => { stackRefs.current[sIdx] = el; }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, { type: 'stack', index: sIdx })}
                        style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
                    >
                        {stack.length === 0 && (
                            <div style={{ ...stackCardStyle, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }} />
                        )}
                        {stack.map((card, cIdx) => {
                            const isRevealed = !!card.isRevealed;
                            const numToCompress = Math.max(0, stack.length - 8);
                            const currentVisibleHeight = (cIdx < numToCompress && !isRevealed) ? 11 : visibleHeight;
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

                            const isDragging = draggingGroup?.type === 'stack' &&
                                draggingGroup.index === sIdx &&
                                draggingGroup.cardIndex !== undefined &&
                                cIdx >= draggingGroup.cardIndex &&
                                cIdx < draggingGroup.cardIndex + (draggingGroup.count || 1);

                            const isLanded = landingGroup?.targetIds.includes(card.id) ?? false;

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
                                        marginBottom: cIdx === stack.length - 1 ? '0' : `${currentOverlapMargin}px`,
                                        zIndex: cIdx,
                                        cursor: canDrag ? 'grab' : 'default',
                                        border: isRevealed
                                            ? (card.type === 'category' ? '3px solid #ff9f43' : '1px solid #ddd')
                                            : '1px solid rgba(0,0,0,0.2)',
                                        boxShadow: (isRevealed && card.type === 'category') ? '0 0 10px rgba(255,159,67,0.2)' : 'none',
                                        visibility: isDragging ? 'hidden' : 'visible',
                                        transform: (isLanded && landingGroup)
                                            ? (landingGroup.animating ? 'none' : `translate(${landingGroup.offsetX}px, ${landingGroup.offsetY}px)`)
                                            : 'none',
                                        transition: (isLanded && landingGroup && !landingGroup.animating)
                                            ? 'none'
                                            : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)'
                                    }}
                                >
                                    {isRevealed && (
                                        <div style={{
                                            height: '100%',
                                            width: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: cIdx === stack.length - 1 ? 'center' : 'flex-start',
                                            alignItems: 'center',
                                            paddingTop: cIdx === stack.length - 1 ? '0' : '0px'
                                        }}>
                                            {card.type === 'category' && (
                                                <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43' }}>
                                                    <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                                </div>
                                            )}
                                            <span style={{
                                                fontWeight: card.type === 'category' ? '900' : 'normal',
                                                lineHeight: '1.2'
                                            }}>
                                                {card.value}
                                            </span>
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

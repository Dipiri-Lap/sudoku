import React, { useEffect, useState, useRef } from 'react';
import { useWordSort } from '../context/WordSortContext';
import levels from '../data/levels.json';
import { RotateCcw, Undo2, Search, Layers as LayersIcon, Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

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

    const [draggingGroup, setDraggingGroup] = useState<{
        type: 'stack' | 'deck';
        index: number;
        cardIndex?: number;
        count?: number;
        grabOffsetX?: number;
        grabOffsetY?: number;
    } | null>(null);
    const [landingGroup, setLandingGroup] = useState<{
        targetIds: string[];
        offsetX: number;
        offsetY: number;
        animating?: boolean;
        isProxy?: boolean;
        movingCards?: any[];
        targetX?: number;
        targetY?: number;
        grabOffsetX?: number;
        grabOffsetY?: number;
        targetType?: 'slot' | 'stack';
    } | null>(null);
    const [lastDrawnId, setLastDrawnId] = useState<string | null>(null);
    const [prevRevealedCount, setPrevRevealedCount] = useState(0);

    const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
    const stackRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [completingSlot, setCompletingSlot] = useState<number | null>(null);

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

    // Fire confetti + glow animation when a slot completes
    useEffect(() => {
        if (state.lastCompletedSlot === null) return;
        const slotIndex = state.lastCompletedSlot;
        setCompletingSlot(slotIndex);

        const slotEl = slotRefs.current[slotIndex];
        if (slotEl) {
            const rect = slotEl.getBoundingClientRect();
            const x = (rect.left + rect.width / 2) / window.innerWidth;
            const y = (rect.top + rect.height / 2) / window.innerHeight;

            // Phase 1: Burst at slot center
            confetti({
                particleCount: 60,
                spread: 55,
                startVelocity: 28,
                origin: { x, y },
                colors: ['#FFD700', '#FFA500', '#FF6B6B', '#48DBFB', '#1DD1A1'],
                scalar: 0.9,
                gravity: 0.9,
                ticks: 200,
            });

            // Phase 2: Small sparkle burst slightly later
            setTimeout(() => {
                confetti({
                    particleCount: 25,
                    spread: 80,
                    startVelocity: 12,
                    origin: { x, y },
                    colors: ['#FFD700', '#FFFFFF'],
                    scalar: 0.6,
                    gravity: 0.5,
                    ticks: 150,
                });
            }, 180);
        }

        // Clear glow after animation
        const timer = setTimeout(() => {
            setCompletingSlot(null);
            dispatch({ type: 'CLEAR_COMPLETED_SLOT' });
        }, 900);

        return () => clearTimeout(timer);
    }, [state.lastCompletedSlot, dispatch]);

    const handleDragStart = (e: React.DragEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        // Calculate grab offset relative to the clicked card's top-left
        let grabOffsetX = e.clientX - rect.left;
        let grabOffsetY = e.clientY - rect.top;

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

            // Adjustment for grabOffsetY: If we clicked a card in a stack, 
            // the drag group might start at baseIndex. 
            // We need the offset relative to the baseIndex card.
            if (cardIndex > baseIndex) {
                grabOffsetY += (cardIndex - baseIndex) * visibleHeight;
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
                    const siblings = Array.from(container.children).filter(child => !child.classList.contains('drag-ghost-extra'));
                    cardsToClone = siblings.slice(effectiveCardIndex!, (effectiveCardIndex || 0) + count);
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

                // Preserve original grab position in ghost
                e.dataTransfer.setDragImage(ghost, grabOffsetX, grabOffsetY);

                setTimeout(() => {
                    if (ghost.parentNode) document.body.removeChild(ghost);
                }, 100);
            }
        }

        setTimeout(() => {
            setDraggingGroup({ type, index, cardIndex: effectiveCardIndex, count, grabOffsetX, grabOffsetY });
        }, 0);
    };

    // 두 rect의 겹치는 면적 계산
    const getOverlapArea = (
        r1: { left: number; top: number; right: number; bottom: number },
        r2: { left: number; top: number; right: number; bottom: number }
    ): number => {
        const overlapX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
        const overlapY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
        return overlapX * overlapY;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggingGroup) return;

        const x = e.clientX;
        const y = e.clientY;
        const grabOffsetX = draggingGroup.grabOffsetX || 0;
        const grabOffsetY = draggingGroup.grabOffsetY || 0;
        const dragLeft = x - grabOffsetX;
        const dragTop = y - grabOffsetY;

        // 드래그 카드 그룹의 rect
        const count = draggingGroup.count || 1;
        const groupHeight = cardHeight + (count - 1) * visibleHeight;
        const dragRect = {
            left: dragLeft,
            top: dragTop,
            right: dragLeft + finalCardWidth,
            bottom: dragTop + groupHeight,
        };

        let bestTarget: { type: 'slot' | 'stack', index: number } | null = null;
        let bestOverlap = 0;

        // 슬롯과의 겹침 검사 (22px 탭 spacer 제외, 실제 카드 영역만)
        for (let i = 0; i < slotRefs.current.length; i++) {
            const ref = slotRefs.current[i];
            if (ref) {
                const r = ref.getBoundingClientRect();
                const slotCardRect = { left: r.left, top: r.top + 22, right: r.right, bottom: r.bottom };
                const overlap = getOverlapArea(dragRect, slotCardRect);
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    bestTarget = { type: 'slot', index: i };
                }
            }
        }

        // 스택의 각 개별 카드 rect와 겹침 검사
        for (let i = 0; i < stackRefs.current.length; i++) {
            const ref = stackRefs.current[i];
            if (!ref) continue;
            const stackRect = ref.getBoundingClientRect();
            const stack = state.stacks[i];

            if (stack.length === 0) {
                // 빈 스택: 컨테이너 rect 전체로 검사
                const overlap = getOverlapArea(dragRect, {
                    left: stackRect.left, top: stackRect.top,
                    right: stackRect.right, bottom: stackRect.bottom
                });
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    bestTarget = { type: 'stack', index: i };
                }
            } else {
                // 각 카드의 rect를 수학적으로 계산
                const numToCompress = Math.max(0, stack.length - 8);
                let topOffset = 0;
                for (let j = 0; j < stack.length; j++) {
                    const isFaceDown = !stack[j].isRevealed;
                    const cardRect = {
                        left: stackRect.left,
                        top: stackRect.top + topOffset,
                        right: stackRect.left + finalCardWidth,
                        bottom: stackRect.top + topOffset + cardHeight,
                    };
                    const overlap = getOverlapArea(dragRect, cardRect);
                    if (overlap > bestOverlap) {
                        bestOverlap = overlap;
                        bestTarget = { type: 'stack', index: i };
                    }
                    topOffset += (j < numToCompress && isFaceDown) ? 11 : visibleHeight;
                }
            }
        }

        // 겹치는 영역이 전혀 없으면 원위치
        if (!bestTarget || bestOverlap === 0) {
            setDraggingGroup(null);
            return;
        }

        const dropTarget = bestTarget as { type: 'slot' | 'stack', index: number };
        const movingCards = draggingGroup.type === 'deck'
            ? [state.revealedDeck[state.revealedDeck.length - 1]]
            : state.stacks[draggingGroup.index].slice(draggingGroup.cardIndex, (draggingGroup.cardIndex || 0) + (draggingGroup.count || 0));

        if (!movingCards.length) {
            setDraggingGroup(null);
            return;
        }

        // Synchronized compatibility check
        let isCompatible = false;
        const isSameSource = (draggingGroup.type === dropTarget.type && draggingGroup.index === dropTarget.index);

        if (!isSameSource && movingCards.length > 0) {
            if (dropTarget.type === 'slot') {
                const slot = state.activeSlots[dropTarget.index];
                if (movingCards[0].type === 'category') {
                    isCompatible = movingCards.length === 1 && slot === null;
                } else if (movingCards[0].type === 'word') {
                    isCompatible = slot !== null && movingCards.every(c => c.cat === slot.catId);
                }
            } else {
                const targetStack = state.stacks[dropTarget.index];
                if (targetStack.length === 0) {
                    isCompatible = true; // 빈 스택에는 일반 카드(단어)와 카테고리 기점 카드 모두 배치 가능
                } else {
                    const topTarget = targetStack[targetStack.length - 1];
                    // Explicitly same as reducer: (topTarget.type === 'category' || topTarget.cat !== movingCards[0].cat) -> disallowed
                    isCompatible = topTarget.type === 'word' && topTarget.cat === movingCards[0].cat;
                }
            }
        }

        if (isCompatible) {
            const containerRef = dropTarget.type === 'slot' ? slotRefs.current[dropTarget.index] : stackRefs.current[dropTarget.index];
            if (containerRef) {
                const rect = containerRef.getBoundingClientRect();
                const targetCenterX = rect.left + finalCardWidth / 2;
                let targetCenterY = 0;

                if (dropTarget.type === 'slot') {
                    targetCenterY = rect.top + 22 + cardHeight / 2;
                } else {
                    const targetStack = state.stacks[dropTarget.index];
                    const nextIndex = targetStack.length;
                    const numToCompress = Math.max(0, (nextIndex + movingCards.length) - 8);
                    let topOffset = 0;
                    for (let i = 0; i < nextIndex; i++) {
                        const isFaceDown = !targetStack[i].isRevealed;
                        topOffset += (i < numToCompress && isFaceDown) ? 11 : 22;
                    }
                    targetCenterY = rect.top + topOffset + cardHeight / 2;
                }

                const diffX = dragLeft - (targetCenterX - finalCardWidth / 2);
                const diffY = dragTop - (targetCenterY - cardHeight / 2);

                setLandingGroup({
                    targetIds: [],
                    isProxy: true,
                    movingCards,
                    targetX: targetCenterX,
                    targetY: targetCenterY,
                    offsetX: diffX,
                    offsetY: diffY,
                    grabOffsetX,
                    grabOffsetY,
                    animating: false,
                    targetType: dropTarget.type
                });

                // Small delay to trigger transition
                setTimeout(() => {
                    setLandingGroup(prev => prev ? { ...prev, animating: true } : null);
                }, 10);

                const staggeredDelay = movingCards.length * 40;
                const totalAnimationTime = 380 + staggeredDelay;

                setTimeout(() => {
                    dispatch({
                        type: 'MOVE_CARD',
                        from: {
                            type: draggingGroup.type,
                            index: draggingGroup.index,
                            cardIndex: draggingGroup.cardIndex,
                            count: draggingGroup.count
                        },
                        to: dropTarget
                    });
                    setDraggingGroup(null);
                }, totalAnimationTime - 20);

                setTimeout(() => setLandingGroup(null), totalAnimationTime);
                return;
            }
        }
        setDraggingGroup(null);
    };

    const drawDeck = () => {
        dispatch({ type: 'DRAW_DECK' });
    };

    const cardBaseStyle: React.CSSProperties = {
        width: '100%',
        aspectRatio: '2 / 2.8',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        position: 'relative',
        transition: 'transform 0.1s ease',
        border: '1px solid #ddd',
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
        <div
            className="word-solitaire-game"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e)}
            style={{
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
                    @keyframes slotComplete {
                        0%   { transform: scale(1);     box-shadow: 0 0 0px rgba(255,215,0,0); }
                        20%  { transform: scale(1.12);  box-shadow: 0 0 28px rgba(255,215,0,0.9); }
                        45%  { transform: scale(0.96);  box-shadow: 0 0 16px rgba(255,215,0,0.6); }
                        65%  { transform: scale(1.06);  box-shadow: 0 0 22px rgba(255,215,0,0.8); }
                        80%  { transform: scale(0.99);  box-shadow: 0 0 10px rgba(255,215,0,0.4); }
                        100% { transform: scale(1);     box-shadow: 0 0 0px rgba(255,215,0,0); }
                    }
                    .animate-slot-complete {
                        animation: slotComplete 0.9s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
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
                                        onDragEnd={() => !landingGroup && setDraggingGroup(null)}
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
                                            visibility: (isDragging || (landingGroup?.isProxy && landingGroup.movingCards?.some(mc => mc.id === card.id))) ? 'hidden' : 'visible',
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
                                                borderRadius: '11px',
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
                            <div style={{ ...slotCardStyle, width: `${finalCardWidth}px`, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', position: 'absolute', right: 0 }}>
                                <div style={{ opacity: 0.2, fontSize: '0.7rem' }}>카드 없음</div>
                            </div>
                        )}
                    </div>
                    <div onClick={drawDeck} style={{ position: 'relative', cursor: 'pointer' }}>
                        <div style={{
                            ...slotCardStyle,
                            width: `${finalCardWidth}px`,
                            background: state.deck.length > 0 ? faceDownPattern : 'rgba(255,255,255,0.05)',
                            border: state.deck.length > 0 ? '1px solid #ddd' : '1px dashed rgba(255,255,255,0.2)',
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
                gridTemplateColumns: `repeat(${Object.keys(state.activeSlots).length}, ${finalCardWidth}px)`,
                gap: `${gap}px`,
                marginBottom: '1.5rem',
                maxWidth: 'fit-content',
                marginInline: 'auto'
            }}>
                {Object.keys(state.activeSlots).map(key => {
                    const i = Number(key);
                    const slot = state.activeSlots[i];

                    return (
                        <div key={i} ref={el => { slotRefs.current[i] = el; }} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {/* Tab Area - Only spacer for alignment (No tab as per request) */}
                            <div style={{ height: '22px' }} />
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={(e) => { handleDrop(e); e.stopPropagation(); }}
                                className={completingSlot === i ? 'animate-slot-complete' : ''}
                                style={{
                                    ...slotCardStyle,
                                    background: slot ? '#fff9f2' : 'rgba(255,255,255,0.03)',
                                    color: '#333',
                                    border: slot
                                        ? '3px solid #ff9f43'
                                        : '1px dashed rgba(255,255,255,0.2)',
                                    opacity: 1,
                                    width: `${finalCardWidth}px`,
                                    boxShadow: slot ? '0 0 15px rgba(255,159,67,0.3)' : 'none',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {slot ? (
                                    <>
                                        {/* 내부 상단: '0/4 주방' 형식 및 왕관 아이콘 */}
                                        <div style={{
                                            position: 'absolute', top: '6px', left: '8px', right: '8px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <span style={{
                                                fontSize: (slot.collected.length + slot.target + 1 + (slot.name?.length || 0)) > 8 ? '0.65rem' : '0.75rem',
                                                color: '#a0522d',
                                                fontWeight: '900',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {slot.collected.length}/{slot.target} {slot.name}
                                            </span>
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
                        onDrop={(e) => { handleDrop(e); e.stopPropagation(); }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            minHeight: `${cardHeight}px`
                        }}
                    >
                        {stack.length === 0 && (
                            <div style={{ ...stackCardStyle, borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)' }} />
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

                            const isProxyMoving = landingGroup?.isProxy && landingGroup.movingCards?.some(mc => mc.id === card.id);

                            return (
                                <div
                                    key={cIdx}
                                    draggable={canDrag}
                                    onDragStart={e => canDrag && handleDragStart(e, 'stack', sIdx, cIdx)}
                                    onDragEnd={() => !landingGroup && setDraggingGroup(null)}
                                    onDragOver={e => e.preventDefault()}
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
                                            : '1px solid #ddd',
                                        boxShadow: (isRevealed && card.type === 'category') ? '0 0 10px rgba(255,159,67,0.2)' : 'none',
                                        visibility: (isDragging || isProxyMoving) ? 'hidden' : 'visible',
                                        transform: 'none',
                                        transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)'
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
                                            {card.type === 'category' && (() => {
                                                const category = state.categories.find(c => c.id === card.cat);
                                                return (
                                                    <>
                                                        <div style={{ position: 'absolute', top: '4px', left: '6px', color: '#ff9f43', fontSize: '0.65rem', fontWeight: '900' }}>
                                                            0/{category?.target || 5}
                                                        </div>
                                                        <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43' }}>
                                                            <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                                        </div>
                                                    </>
                                                );
                                            })()}
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

            {/* Proxy Animation Layer */}
            {landingGroup?.isProxy && landingGroup.movingCards && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 9999
                }}>
                    {landingGroup.movingCards.map((card, idx) => {
                        return (
                            <div
                                key={card.id}
                                style={{
                                    ...stackCardStyle,
                                    position: 'absolute',
                                    width: `${finalCardWidth}px`,
                                    height: `${cardHeight}px`,
                                    left: `${(landingGroup.targetX ?? 0) - finalCardWidth / 2}px`,
                                    top: `${(landingGroup.targetY ?? 0) - cardHeight / 2}px`,
                                    background: card.type === 'category' ? '#fff9f2' : 'white',
                                    color: '#333',
                                    border: card.type === 'category' ? '3px solid #ff9f43' : '1px solid #ddd',
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
                                {card.type === 'category' && (() => {
                                    const category = state.categories.find(c => c.id === card.cat);
                                    return (
                                        <>
                                            <div style={{ position: 'absolute', top: '4px', left: '6px', color: '#ff9f43', fontSize: '0.65rem', fontWeight: '900' }}>
                                                0/{category?.target || 5}
                                            </div>
                                            <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43' }}>
                                                <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                            </div>
                                        </>
                                    );
                                })()}
                                <span style={{
                                    fontWeight: card.type === 'category' ? '900' : 'normal',
                                    fontSize: card.type === 'category' ? '0.9rem' : '0.85rem'
                                }}>
                                    {card.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WordSortGame;

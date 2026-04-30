import { useState, useRef, useEffect } from 'react';
import type { WordSolitaireState } from '../context/WordSortContext';

interface UseWordSortDragParams {
    state: WordSolitaireState;
    dispatch: React.Dispatch<any>;
    tutorialStep: number | null;
    gatheringCat: string | null;
    stackRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    slotRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
    finalCardWidth: number;
    cardHeight: number;
    visibleHeight: number;
    sfxVolume: number;
}

export function useWordSortDrag(params: UseWordSortDragParams) {
    const { state, dispatch, tutorialStep, gatheringCat, stackRefs, slotRefs, finalCardWidth, cardHeight, visibleHeight, sfxVolume } = params;

    const [draggingGroup, setDraggingGroup] = useState<{
        type: 'stack' | 'deck';
        index: number;
        cardIndex?: number;
        count?: number;
        grabOffsetX?: number;
        grabOffsetY?: number;
    } | null>(null);

    const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number } | null>(null);

    const [nearestValidTarget, setNearestValidTarget] = useState<{ type: 'slot' | 'stack'; index: number } | null>(null);
    const [nearestTarget, setNearestTarget] = useState<{ type: 'slot' | 'stack'; index: number } | null>(null);
    const [invalidDropTarget, setInvalidDropTarget] = useState<{ type: 'slot' | 'stack'; index: number } | null>(null);

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

    // Ref for synchronous access during touch events (state updates are async)
    const touchDragRef = useRef<{
        type: 'stack' | 'deck';
        index: number;
        cardIndex?: number;
        count?: number;
        grabOffsetX?: number;
        grabOffsetY?: number;
    } | null>(null);

    // Trigger animation shortly after landing state is set
    useEffect(() => {
        if (landingGroup && !landingGroup.animating) {
            const timer = setTimeout(() => {
                setLandingGroup(prev => prev ? { ...prev, animating: true } : null);
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [landingGroup?.targetIds, landingGroup?.animating]);

    // 두 rect의 겹치는 면적 계산
    const getOverlapArea = (
        r1: { left: number; top: number; right: number; bottom: number },
        r2: { left: number; top: number; right: number; bottom: number }
    ): number => {
        const overlapX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
        const overlapY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
        return overlapX * overlapY;
    };

    // ─── Shared: Compute drag start info from coordinates ───────────────────────
    const _computeDragStart = (
        clientX: number,
        clientY: number,
        target: HTMLElement,
        type: 'stack' | 'deck',
        index: number,
        cardIndex?: number
    ) => {
        // Tutorial step guards
        if (tutorialStep === 2) {
            if (type === 'deck') return null;
            if (type === 'stack' && cardIndex !== undefined) {
                const stack = state.stacks[index];
                const card = stack[cardIndex];
                if (!(card.isRevealed && card.type === 'category' && cardIndex === stack.length - 1)) return null;
            }
        }
        if (tutorialStep === 3 && type === 'stack') return null;
        if (tutorialStep === 4) {
            if (type === 'deck') return null;
            if (type === 'stack' && cardIndex !== undefined) {
                const card = state.stacks[index][cardIndex];
                if (card.id !== 't4' || cardIndex !== state.stacks[index].length - 1) return null;
            }
        }
        if (tutorialStep === 5) {
            if (type === 'deck') return null;
            if (type === 'stack' && cardIndex !== undefined) {
                const card = state.stacks[index][cardIndex];
                if (card.id !== 't3' || cardIndex !== state.stacks[index].length - 1) return null;
            }
        }
        if (tutorialStep === 6) {
            if (type === 'deck') return null;
            if (type === 'stack' && cardIndex !== undefined) {
                const stack = state.stacks[index];
                const card = stack[cardIndex];
                const below = cardIndex >= 1 ? stack[cardIndex - 1] : null;
                if (!(card.isRevealed && card.type === 'word' && cardIndex === stack.length - 1 &&
                    below?.isRevealed && below.cat === card.cat)) return null;
            }
        }

        const rect = target.getBoundingClientRect();
        let grabOffsetX = clientX - rect.left;
        let grabOffsetY = clientY - rect.top;

        let effectiveCardIndex = cardIndex;
        let count = 1;

        if (type === 'stack' && cardIndex !== undefined) {
            const stack = state.stacks[index];
            const clickedCard = stack[cardIndex];

            let baseIndex = cardIndex;
            for (let i = cardIndex; i >= 0; i--) {
                if (stack[i].cat === clickedCard.cat && stack[i].isRevealed) {
                    baseIndex = i;
                    if (stack[i].type === 'category') break;
                } else {
                    break;
                }
            }

            if (cardIndex > baseIndex) {
                grabOffsetY += (cardIndex - baseIndex) * visibleHeight;
            }

            if (clickedCard.type === 'category') {
                effectiveCardIndex = cardIndex;
                count = 1;
            } else {
                effectiveCardIndex = baseIndex;
                count = stack.length - baseIndex;
            }
        }

        return { type, index, cardIndex: effectiveCardIndex, count, grabOffsetX, grabOffsetY };
    };

    // ─── Shared: Process move (used by both drag and touch) ─────────────────────
    const _processMove = (clientX: number, clientY: number, dragInfo: NonNullable<typeof draggingGroup>) => {
        setDragGhostPos({ x: clientX, y: clientY });

        const grabOffsetX = dragInfo.grabOffsetX || 0;
        const grabOffsetY = dragInfo.grabOffsetY || 0;
        const dragLeft = clientX - grabOffsetX;
        const dragTop = clientY - grabOffsetY;
        const count = dragInfo.count || 1;
        const groupHeight = cardHeight + (count - 1) * visibleHeight;
        const dragRect = { left: dragLeft, top: dragTop, right: dragLeft + finalCardWidth, bottom: dragTop + groupHeight };

        let bestTarget: { type: 'slot' | 'stack'; index: number } | null = null;
        let bestOverlap = 0;

        for (const slotKey of Object.keys(state.activeSlots).map(Number)) {
            const ref = slotRefs.current[slotKey];
            if (ref) {
                const r = ref.getBoundingClientRect();
                const overlap = getOverlapArea(dragRect, { left: r.left, top: r.top + 25, right: r.right, bottom: r.bottom });
                if (overlap > bestOverlap) { bestOverlap = overlap; bestTarget = { type: 'slot', index: slotKey }; }
            }
        }

        for (let i = 0; i < stackRefs.current.length; i++) {
            const ref = stackRefs.current[i];
            if (!ref) continue;
            const stackRect = ref.getBoundingClientRect();
            const stack = state.stacks[i];
            if (stack.length === 0) {
                const overlap = getOverlapArea(dragRect, { left: stackRect.left, top: stackRect.top, right: stackRect.right, bottom: stackRect.bottom });
                if (overlap > bestOverlap) { bestOverlap = overlap; bestTarget = { type: 'stack', index: i }; }
            } else {
                const numToCompress = Math.max(0, stack.length - 8);
                let topOffset = 0;
                for (let j = 0; j < stack.length; j++) {
                    const cardRect = { left: stackRect.left, top: stackRect.top + topOffset, right: stackRect.left + finalCardWidth, bottom: stackRect.top + topOffset + cardHeight };
                    const overlap = getOverlapArea(dragRect, cardRect);
                    if (overlap > bestOverlap) { bestOverlap = overlap; bestTarget = { type: 'stack', index: i }; }
                    topOffset += (j < numToCompress && !stack[j].isRevealed) ? 13 : visibleHeight;
                }
            }
        }

        if (!bestTarget || bestOverlap === 0) { setNearestValidTarget(null); setNearestTarget(null); return; }

        const movingCards = dragInfo.type === 'deck'
            ? [state.revealedDeck[state.revealedDeck.length - 1]]
            : state.stacks[dragInfo.index].slice(dragInfo.cardIndex, (dragInfo.cardIndex || 0) + (dragInfo.count || 0));

        if (!movingCards.length) { setNearestValidTarget(null); return; }

        const isSameSource = dragInfo.type === bestTarget.type && dragInfo.index === bestTarget.index;
        let isCompatible = false;

        if (!isSameSource) {
            if (bestTarget.type === 'slot') {
                const slot = state.activeSlots[bestTarget.index];
                if (movingCards[0].type === 'category') {
                    isCompatible = movingCards.length === 1 && slot === null;
                } else if (movingCards[0].type === 'word') {
                    isCompatible = slot !== null && movingCards.every(c => c.cat === slot.catId);
                }
            } else {
                const targetStack = state.stacks[bestTarget.index];
                if (targetStack.length === 0) {
                    isCompatible = true;
                } else {
                    const topTarget = targetStack[targetStack.length - 1];
                    isCompatible = topTarget.type === 'word' && topTarget.cat === movingCards[0].cat;
                }
            }
        }

        setNearestTarget(isSameSource ? null : bestTarget);
        setNearestValidTarget(isCompatible ? bestTarget : null);
    };

    // ─── Shared: Process drop (used by both drag and touch) ─────────────────────
    const _processDrop = (clientX: number, clientY: number, dragInfo: NonNullable<typeof draggingGroup>) => {
        setNearestTarget(null);
        setNearestValidTarget(null);
        const grabOffsetX = dragInfo.grabOffsetX || 0;
        const grabOffsetY = dragInfo.grabOffsetY || 0;
        const dragLeft = clientX - grabOffsetX;
        const dragTop = clientY - grabOffsetY;

        const count = dragInfo.count || 1;
        const groupHeight = cardHeight + (count - 1) * visibleHeight;
        const dragRect = {
            left: dragLeft,
            top: dragTop,
            right: dragLeft + finalCardWidth,
            bottom: dragTop + groupHeight,
        };

        let bestTarget: { type: 'slot' | 'stack', index: number } | null = null;
        let bestOverlap = 0;

        for (const slotKey of Object.keys(state.activeSlots).map(Number)) {
            const ref = slotRefs.current[slotKey];
            if (ref) {
                const r = ref.getBoundingClientRect();
                const slotCardRect = { left: r.left, top: r.top + 25, right: r.right, bottom: r.bottom };
                const overlap = getOverlapArea(dragRect, slotCardRect);
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    bestTarget = { type: 'slot', index: slotKey };
                }
            }
        }

        for (let i = 0; i < stackRefs.current.length; i++) {
            const ref = stackRefs.current[i];
            if (!ref) continue;
            const stackRect = ref.getBoundingClientRect();
            const stack = state.stacks[i];

            if (stack.length === 0) {
                const overlap = getOverlapArea(dragRect, {
                    left: stackRect.left, top: stackRect.top,
                    right: stackRect.right, bottom: stackRect.bottom
                });
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    bestTarget = { type: 'stack', index: i };
                }
            } else {
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
                    topOffset += (j < numToCompress && isFaceDown) ? 13 : visibleHeight;
                }
            }
        }

        if (!bestTarget || bestOverlap === 0) {
            setDraggingGroup(null);
            return;
        }

        const dropTarget = bestTarget as { type: 'slot' | 'stack', index: number };

        if (tutorialStep === 4 && dropTarget.type === 'stack') {
            setDraggingGroup(null);
            return;
        }
        if (tutorialStep === 5 && dropTarget.type === 'slot') {
            setDraggingGroup(null);
            return;
        }

        const movingCards = dragInfo.type === 'deck'
            ? [state.revealedDeck[state.revealedDeck.length - 1]]
            : state.stacks[dragInfo.index].slice(dragInfo.cardIndex, (dragInfo.cardIndex || 0) + (dragInfo.count || 0));

        if (!movingCards.length) {
            setDraggingGroup(null);
            return;
        }

        let isCompatible = false;
        const isSameSource = (dragInfo.type === dropTarget.type && dragInfo.index === dropTarget.index);

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
                    isCompatible = true;
                } else {
                    const topTarget = targetStack[targetStack.length - 1];
                    isCompatible = topTarget.type === 'word' && topTarget.cat === movingCards[0].cat;
                }
            }
        }

        if (isCompatible) {
            const sfx = new Audio('/assets/word-sort/sounds/cardsfx1.wav');
            sfx.volume = sfxVolume;
            sfx.play().catch(() => {});
            const containerRef = dropTarget.type === 'slot' ? slotRefs.current[dropTarget.index] : stackRefs.current[dropTarget.index];
            if (containerRef) {
                const rect = containerRef.getBoundingClientRect();
                const targetCenterX = rect.left + finalCardWidth / 2;
                let targetCenterY = 0;

                if (dropTarget.type === 'slot') {
                    targetCenterY = rect.top + 25 + cardHeight / 2;
                } else {
                    const targetStack = state.stacks[dropTarget.index];
                    const nextIndex = targetStack.length;
                    const numToCompress = Math.max(0, (nextIndex + movingCards.length) - 8);
                    let topOffset = 0;
                    for (let i = 0; i < nextIndex; i++) {
                        const isFaceDown = !targetStack[i].isRevealed;
                        topOffset += (i < numToCompress && isFaceDown) ? 13 : visibleHeight;
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

                setTimeout(() => {
                    setLandingGroup(prev => prev ? { ...prev, animating: true } : null);
                }, 10);

                const staggeredDelay = movingCards.length * 40;
                const totalAnimationTime = 380 + staggeredDelay;

                setTimeout(() => {
                    dispatch({
                        type: 'MOVE_CARD',
                        from: {
                            type: dragInfo.type,
                            index: dragInfo.index,
                            cardIndex: dragInfo.cardIndex,
                            count: dragInfo.count
                        },
                        to: dropTarget
                    });
                    setDraggingGroup(null);
                }, totalAnimationTime - 20);

                setTimeout(() => setLandingGroup(null), totalAnimationTime);
                return;
            }
        }
        // Incompatible drop: flash red on target for 500ms
        if (!isSameSource && !isCompatible) {
            const sfx = new Audio('/assets/word-sort/sounds/fail.wav');
            sfx.volume = sfxVolume;
            sfx.play().catch(() => {});
            setInvalidDropTarget(dropTarget);
            setTimeout(() => setInvalidDropTarget(null), 500);
        }
        setDraggingGroup(null);
    };

    // ─── HTML5 Drag handlers ─────────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => {
        const result = _computeDragStart(e.clientX, e.clientY, e.currentTarget as HTMLElement, type, index, cardIndex);
        if (!result) return;

        e.dataTransfer.setData('text/plain', '');
        const emptyImg = new Image();
        e.dataTransfer.setDragImage(emptyImg, 0, 0);
        setDragGhostPos({ x: e.clientX, y: e.clientY });
        setInvalidDropTarget(null);

        setTimeout(() => {
            setDraggingGroup(result);
        }, 0);
    };

    const handleDragMove = (e: React.DragEvent) => {
        if (!e.clientX && !e.clientY) return;
        if (!draggingGroup) return;
        _processMove(e.clientX, e.clientY, draggingGroup);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggingGroup) return;
        _processDrop(e.clientX, e.clientY, draggingGroup);
    };

    // ─── Touch handlers ──────────────────────────────────────────────────────────
    const handleTouchStart = (e: React.TouchEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => {
        const touch = e.touches[0];
        const result = _computeDragStart(touch.clientX, touch.clientY, e.currentTarget as HTMLElement, type, index, cardIndex);
        if (!result) return;

        // Store in ref for synchronous access in subsequent touch events
        touchDragRef.current = result;
        setDragGhostPos({ x: touch.clientX, y: touch.clientY });
        setInvalidDropTarget(null);
        setDraggingGroup(result);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const dragInfo = touchDragRef.current;
        if (!dragInfo) return;
        e.preventDefault(); // prevent page scroll while dragging
        const touch = e.touches[0];
        _processMove(touch.clientX, touch.clientY, dragInfo);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const dragInfo = touchDragRef.current;
        touchDragRef.current = null;
        if (!dragInfo) return;
        const touch = e.changedTouches[0];
        _processDrop(touch.clientX, touch.clientY, dragInfo);
        setDragGhostPos(null);
        setNearestValidTarget(null);
        setNearestTarget(null);
    };

    const handleTouchCancel = () => {
        touchDragRef.current = null;
        setDragGhostPos(null);
        setNearestValidTarget(null);
        setNearestTarget(null);
        setDraggingGroup(null);
    };

    return {
        draggingGroup,
        setDraggingGroup,
        dragGhostPos,
        setDragGhostPos,
        landingGroup,
        setLandingGroup,
        nearestValidTarget,
        setNearestValidTarget,
        nearestTarget,
        setNearestTarget,
        invalidDropTarget,
        handleDragStart,
        handleDragMove,
        handleDrop,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
    };
}

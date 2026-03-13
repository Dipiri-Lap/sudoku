import { useState, useEffect } from 'react';
import type { WordSolitaireState } from '../context/WordSortContext';

interface UseWordSortDragParams {
    state: WordSolitaireState;
    dispatch: React.Dispatch<any>;
    tutorialStep: number | null;
    gatheringCat: string | null;
    stackRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    finalCardWidth: number;
    cardHeight: number;
    visibleHeight: number;
}

export function useWordSortDrag(params: UseWordSortDragParams) {
    const { state, dispatch, tutorialStep, gatheringCat, stackRefs, slotRefs, finalCardWidth, cardHeight, visibleHeight } = params;

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

    const handleDragStart = (e: React.DragEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => {
        // Step 2: only top-of-stack category cards are allowed
        if (tutorialStep === 2) {
            if (type === 'deck') return;
            if (type === 'stack' && cardIndex !== undefined) {
                const stack = state.stacks[index];
                const card = stack[cardIndex];
                if (!(card.isRevealed && card.type === 'category' && cardIndex === stack.length - 1)) return;
            }
        }
        // Step 3: only deck interaction is allowed
        if (tutorialStep === 3 && type === 'stack') return;
        // Step 4: only 바나나(t4) is draggable; deck blocked
        if (tutorialStep === 4) {
            if (type === 'deck') return;
            if (type === 'stack' && cardIndex !== undefined) {
                const card = state.stacks[index][cardIndex];
                if (card.id !== 't4' || cardIndex !== state.stacks[index].length - 1) return;
            }
        }
        // Step 5: only 딸기(t3) is draggable; deck blocked
        if (tutorialStep === 5) {
            if (type === 'deck') return;
            if (type === 'stack' && cardIndex !== undefined) {
                const card = state.stacks[index][cardIndex];
                if (card.id !== 't3' || cardIndex !== state.stacks[index].length - 1) return;
            }
        }
        // Step 6: only top card of a stack with a consecutive same-cat pair below is draggable; deck blocked
        if (tutorialStep === 6) {
            if (type === 'deck') return;
            if (type === 'stack' && cardIndex !== undefined) {
                const stack = state.stacks[index];
                const card = stack[cardIndex];
                const below = cardIndex >= 1 ? stack[cardIndex - 1] : null;
                if (!(card.isRevealed && card.type === 'word' && cardIndex === stack.length - 1 &&
                    below?.isRevealed && below.cat === card.cat)) return;
            }
        }

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

        // 빈 드래그 이미지 설정 → React 플로팅 고스트 사용
        const emptyImg = new Image();
        e.dataTransfer.setDragImage(emptyImg, 0, 0);
        setDragGhostPos({ x: e.clientX, y: e.clientY });

        setTimeout(() => {
            setDraggingGroup({ type, index, cardIndex: effectiveCardIndex, count, grabOffsetX, grabOffsetY });
        }, 0);
    };

    const handleDragMove = (e: React.DragEvent) => {
        if (!e.clientX && !e.clientY) return;
        setDragGhostPos({ x: e.clientX, y: e.clientY });

        if (!draggingGroup) return;

        const grabOffsetX = draggingGroup.grabOffsetX || 0;
        const grabOffsetY = draggingGroup.grabOffsetY || 0;
        const dragLeft = e.clientX - grabOffsetX;
        const dragTop = e.clientY - grabOffsetY;
        const count = draggingGroup.count || 1;
        const groupHeight = cardHeight + (count - 1) * visibleHeight;
        const dragRect = { left: dragLeft, top: dragTop, right: dragLeft + finalCardWidth, bottom: dragTop + groupHeight };

        let bestTarget: { type: 'slot' | 'stack'; index: number } | null = null;
        let bestOverlap = 0;

        for (let i = 0; i < slotRefs.current.length; i++) {
            const ref = slotRefs.current[i];
            if (ref) {
                const r = ref.getBoundingClientRect();
                const overlap = getOverlapArea(dragRect, { left: r.left, top: r.top + 25, right: r.right, bottom: r.bottom });
                if (overlap > bestOverlap) { bestOverlap = overlap; bestTarget = { type: 'slot', index: i }; }
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

        if (!bestTarget || bestOverlap === 0) { setNearestValidTarget(null); return; }

        const movingCards = draggingGroup.type === 'deck'
            ? [state.revealedDeck[state.revealedDeck.length - 1]]
            : state.stacks[draggingGroup.index].slice(draggingGroup.cardIndex, (draggingGroup.cardIndex || 0) + (draggingGroup.count || 0));

        if (!movingCards.length) { setNearestValidTarget(null); return; }

        const isSameSource = draggingGroup.type === bestTarget.type && draggingGroup.index === bestTarget.index;
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

        setNearestValidTarget(isCompatible ? bestTarget : null);
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
                const slotCardRect = { left: r.left, top: r.top + 25, right: r.right, bottom: r.bottom };
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
                    topOffset += (j < numToCompress && isFaceDown) ? 13 : visibleHeight;
                }
            }
        }

        // 겹치는 영역이 전혀 없으면 원위치
        if (!bestTarget || bestOverlap === 0) {
            setDraggingGroup(null);
            return;
        }

        const dropTarget = bestTarget as { type: 'slot' | 'stack', index: number };

        // Step 4: block stack drops (바나나 must go to the slot only)
        if (tutorialStep === 4 && dropTarget.type === 'stack') {
            setDraggingGroup(null);
            return;
        }

        // Step 5: block slot drops (this step teaches stack-to-stack movement)
        if (tutorialStep === 5 && dropTarget.type === 'slot') {
            setDraggingGroup(null);
            return;
        }

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
                    targetCenterY = rect.top + 25 + cardHeight / 2;
                } else {
                    const targetStack = state.stacks[dropTarget.index];
                    const nextIndex = targetStack.length;
                    const numToCompress = Math.max(0, (nextIndex + movingCards.length) - 8);
                    let topOffset = 0;
                    for (let i = 0; i < nextIndex; i++) {
                        const isFaceDown = !targetStack[i].isRevealed;
                        topOffset += (i < numToCompress && isFaceDown) ? 13 : 25;
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

    return {
        draggingGroup,
        setDraggingGroup,
        dragGhostPos,
        setDragGhostPos,
        landingGroup,
        setLandingGroup,
        nearestValidTarget,
        setNearestValidTarget,
        handleDragStart,
        handleDragMove,
        handleDrop,
    };
}

import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useWordSort } from '../context/WordSortContext';
import levels from '../data/levels.json';
import tutorialLevel from '../data/tutorial-level.json';
import TutorialOverlay from './TutorialOverlay';
import { RotateCcw, Undo2, Search, Layers as LayersIcon, Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCoins } from '../../../context/CoinContext';
import CoinDisplay from '../../../common/components/CoinDisplay';
import { useCardBack, AVAILABLE_CARD_BACKS } from '../context/CardBackContext';
import CardBackShopModal from './CardBackShopModal';


const WordSortGame: React.FC = () => {

    const { state, dispatch } = useWordSort();
    const { addCoins, spendCoins, coins } = useCoins();
    const hasAwardedCoins = useRef(false);

    const [lockedStacks, setLockedStacks] = useState(1);
    const [lockedSlots, setLockedSlots] = useState(1);
    const [unlockConfirm, setUnlockConfirm] = useState<'stack' | 'slot' | null>(null);
    const [isShopOpen, setIsShopOpen] = useState(false);

    const { selectedId } = useCardBack();
    const currentCardBack = AVAILABLE_CARD_BACKS.find(cb => cb.id === selectedId) || AVAILABLE_CARD_BACKS[0];


    // Dynamic card width: measure the actual container width via ref (most reliable)
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const [containerMaxWidth, setContainerMaxWidth] = useState(
        Math.min(500, document.documentElement.clientWidth) - 64
    );
    useLayoutEffect(() => {
        const update = () => {
            if (gameContainerRef.current) {
                // clientWidth = element's own width (excluding own padding)
                // subtract own L+R padding (1rem each = 32px total)
                setContainerMaxWidth(gameContainerRef.current.clientWidth - 32);
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    const gap = 12;
    const activeSlotCount = Object.keys(state.activeSlots).length;
    const displayColumns = Math.min(7, Math.max(
        state.stacks.length + lockedStacks,
        activeSlotCount + lockedSlots
    ));
    const cardWidth = Math.floor((containerMaxWidth - (displayColumns - 1) * gap) / displayColumns);
    // Lower minimum to 36 so 7 columns can fit on small screens
    const finalCardWidth = Math.min(110, Math.max(36, cardWidth));
    const cardHeight = Math.round(finalCardWidth * 1.4);
    const visibleHeight = 25; // Height of the visible strip for overlapped cards
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

    // Tutorial
    const [tutorialStep, setTutorialStep] = useState<number | null>(null);
    const prevActiveSlotsRef = useRef(0);
    const prevCollectedRef = useRef(0);
    const prevRevealedDeckRef = useRef(0);
    const prevStepsLeftRef = useRef(0);

    // Dealing animation
    const [isDealingAnimation, setIsDealingAnimation] = useState(false);
    const [dealingProgress, setDealingProgress] = useState(0);
    const dealingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const deckCardRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        return () => { if (dealingTimerRef.current) clearInterval(dealingTimerRef.current); };
    }, []);

    // Reset coin award flag on new game
    useEffect(() => {
        if (!state.isWinner) hasAwardedCoins.current = false;
    }, [state.isWinner]);

    // Award coins on win (not tutorial)
    useEffect(() => {
        if (state.isWinner && tutorialStep === null && !hasAwardedCoins.current) {
            hasAwardedCoins.current = true;
            addCoins(10);
        }
    }, [state.isWinner, tutorialStep, addCoins]);

    const triggerDealing = (totalCards: number) => {
        if (dealingTimerRef.current) clearInterval(dealingTimerRef.current);
        setIsDealingAnimation(true);
        setDealingProgress(0);
        let count = 0;
        dealingTimerRef.current = setInterval(() => {
            count++;
            setDealingProgress(count);
            if (count >= totalCards) {
                clearInterval(dealingTimerRef.current!);
                dealingTimerRef.current = null;
                setTimeout(() => setIsDealingAnimation(false), 350);
            }
        }, 80);
    };

    // Set CSS variables on each newly-dealt card so it animates FROM the deck position
    useLayoutEffect(() => {
        if (!isDealingAnimation || dealingProgress === 0) return;

        const globalIdx = dealingProgress - 1;
        let sIdx = 0, cIdx = 0, rem = globalIdx;
        for (; sIdx < state.stacks.length; sIdx++) {
            if (rem < state.stacks[sIdx].length) { cIdx = rem; break; }
            rem -= state.stacks[sIdx].length;
        }

        const deckEl = deckCardRef.current;
        const stackEl = stackRefs.current[sIdx];
        if (!deckEl || !stackEl) return;

        const deckRect = deckEl.getBoundingClientRect();
        const stackRect = stackEl.getBoundingClientRect();

        // Calculate the card's Y position within the stack
        let topOffset = 0;
        const stack = state.stacks[sIdx];
        const numToCompress = Math.max(0, stack.length - 8);
        for (let i = 0; i < cIdx; i++) {
            topOffset += (i < numToCompress && !stack[i].isRevealed) ? 13 : visibleHeight;
        }

        const cardCenterX = stackRect.left + finalCardWidth / 2;
        const cardCenterY = stackRect.top + topOffset + cardHeight / 2;
        const deckCenterX = deckRect.left + deckRect.width / 2;
        const deckCenterY = deckRect.top + deckRect.height / 2;

        // fromX/Y = offset to translate the card FROM deck center TO its natural position
        const fromX = deckCenterX - cardCenterX;
        const fromY = deckCenterY - cardCenterY;

        const cardEl = stackEl.children[cIdx] as HTMLElement;
        if (cardEl) {
            cardEl.style.setProperty('--deal-from-x', `${fromX}px`);
            cardEl.style.setProperty('--deal-from-y', `${fromY}px`);
        }
    }, [dealingProgress, isDealingAnimation]);

    const levelStackTotal = (levelData: any): number => {
        if (levelData.fixedStacks) {
            return levelData.fixedStacks.reduce((s: number, st: any[]) => s + st.length, 0);
        }
        const counts = (levelData.slots || 4) === 3 ? [4, 5, 6] : [4, 5, 6, 7];
        return counts.reduce((a: number, b: number) => a + b, 0);
    };

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
        const tutorialDone = !import.meta.env.DEV && localStorage.getItem('wordSort_tutorialDone');
        if (!tutorialDone) {
            dispatch({ type: 'START_LEVEL', levelData: tutorialLevel });
            setTutorialStep(1);
            triggerDealing(levelStackTotal(tutorialLevel));
        } else if (levels && levels.length > 0) {
            dispatch({ type: 'START_LEVEL', levelData: levels[0] });
            triggerDealing(levelStackTotal(levels[0]));
        }
    }, [dispatch]);

    const resetUnlocks = () => {
        setLockedStacks(1);
        setLockedSlots(1);
    };

    const completeTutorial = () => {
        localStorage.setItem('wordSort_tutorialDone', 'true');
        setTutorialStep(null);
        resetUnlocks();
        dispatch({ type: 'START_LEVEL', levelData: levels[0] });
        triggerDealing(levelStackTotal(levels[0]));
    };

    const handleUnlockConfirm = async () => {
        if (!unlockConfirm) return;
        const success = await spendCoins(20);
        if (!success) { setUnlockConfirm(null); return; }
        if (unlockConfirm === 'stack') {
            dispatch({ type: 'UNLOCK_STACK' });
            setLockedStacks(prev => prev - 1);
        } else {
            dispatch({ type: 'UNLOCK_SLOT' });
            setLockedSlots(prev => prev - 1);
        }
        setUnlockConfirm(null);
    };

    // Advance tutorial based on game state changes
    useEffect(() => {
        if (tutorialStep === null || tutorialStep === 1 || tutorialStep === 8) return;

        const activeSlotsCount = Object.values(state.activeSlots).filter(Boolean).length;
        const totalCollected = Object.values(state.activeSlots).reduce((acc, s) => acc + (s?.collected.length ?? 0), 0);
        const revealedCount = state.revealedDeck.length;

        if (tutorialStep === 2 && activeSlotsCount > prevActiveSlotsRef.current) {
            setTutorialStep(3);
        } else if (tutorialStep === 3 && revealedCount > prevRevealedDeckRef.current) {
            setTutorialStep(4);
        } else if (tutorialStep === 4 && totalCollected > prevCollectedRef.current) {
            setTutorialStep(5);
        } else if (tutorialStep === 5) {
            // Detect when 딸기 is placed on 사과 (same-cat pair forms in a stack)
            const hasSameCatPair = state.stacks.some(stack => {
                if (stack.length < 2) return false;
                const top = stack[stack.length - 1];
                const below = stack[stack.length - 2];
                return top?.isRevealed && below?.isRevealed &&
                    top.type === 'word' && below.type === 'word' &&
                    top.cat === below.cat;
            });
            if (hasSameCatPair) setTutorialStep(6);
        } else if (tutorialStep === 6 && state.lastCompletedSlot !== null) {
            setTutorialStep(7);
        } else if (tutorialStep === 7 && state.isWinner) {
            setTutorialStep(8);
        }

        prevActiveSlotsRef.current = activeSlotsCount;
        prevCollectedRef.current = totalCollected;
        prevRevealedDeckRef.current = revealedCount;
        prevStepsLeftRef.current = state.stepsLeft;
    }, [state, tutorialStep]);

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

    const drawDeck = () => {
        if (tutorialStep === 2 || tutorialStep === 4 || tutorialStep === 5 || tutorialStep === 6) return;
        dispatch({ type: 'DRAW_DECK' });
    };

    const cardBaseStyle: React.CSSProperties = {
        width: `${finalCardWidth}px`,
        height: `${cardHeight}px`,
        flexShrink: 0,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        position: 'relative',
        transition: 'transform 0.1s ease',
        padding: '5px',
        color: '#333',
        overflow: 'hidden',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
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

    const faceDownPattern = currentCardBack.pattern;


    // Tutorial highlight sets
    const tutorialHighlightCards = new Set<string>();
    const tutorialHighlightSlots = new Set<number>();
    let tutorialHighlightDeck = false;

    if (tutorialStep === 2) {
        // 카테고리 카드(스택 상단) + 빈 슬롯
        state.stacks.forEach(stack => {
            const top = stack[stack.length - 1];
            if (top?.isRevealed && top.type === 'category') tutorialHighlightCards.add(top.id);
        });
        if (state.revealedDeck.length > 0) {
            const top = state.revealedDeck[state.revealedDeck.length - 1];
            if (top.type === 'category') tutorialHighlightCards.add(top.id);
        }
        Object.entries(state.activeSlots).forEach(([k, slot]) => {
            if (!slot) tutorialHighlightSlots.add(Number(k));
        });
    } else if (tutorialStep === 3) {
        tutorialHighlightDeck = true;
    } else if (tutorialStep === 4) {
        // 활성 슬롯 + 바나나(t4)만 강조
        Object.entries(state.activeSlots).forEach(([k, slot]) => {
            if (slot) tutorialHighlightSlots.add(Number(k));
        });
        state.stacks.forEach(stack => {
            const top = stack[stack.length - 1];
            if (top?.isRevealed && top.id === 't4') tutorialHighlightCards.add(top.id);
        });
    } else if (tutorialStep === 5) {
        // 딸기(t3)만 강조
        state.stacks.forEach(stack => {
            const top = stack[stack.length - 1];
            if (top?.isRevealed && top.id === 't3') tutorialHighlightCards.add(top.id);
        });
    } else if (tutorialStep === 6) {
        // 그룹 이동 가능한 묶음의 최상단 + 활성 슬롯 강조
        state.stacks.forEach(stack => {
            // 연속 같은카테고리 2장 이상이면 최상단 카드 강조
            if (stack.length >= 2) {
                const top = stack[stack.length - 1];
                const second = stack[stack.length - 2];
                if (top?.isRevealed && second?.isRevealed && top.cat === second.cat)
                    tutorialHighlightCards.add(top.id);
            }
        });
        Object.entries(state.activeSlots).forEach(([k, slot]) => {
            if (slot) tutorialHighlightSlots.add(Number(k));
        });
    }

    // Dealing: cumulative start index per stack (for global card ordering)
    const stackStartIndices = state.stacks.map((_, idx) =>
        state.stacks.slice(0, idx).reduce((sum, s) => sum + s.length, 0)
    );

    return (
        <div
            ref={gameContainerRef}
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
                overflow: 'hidden',
                paddingBottom: tutorialStep !== null ? '200px' : undefined,
            }}>

            {/* Level label + Coin display */}
            {tutorialStep === null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.55, fontWeight: '700', letterSpacing: '0.08em' }}>
                        LEVEL {state.level}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setIsShopOpen(true)}
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                border: 'none',
                                borderRadius: '20px',
                                color: 'white',
                                padding: '4px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Sparkles size={14} className="text-yellow-400" /> SHOP
                        </button>
                        <CoinDisplay />
                    </div>
                </div>

            )}

            {/* Stats area (Steps & Deck) */}
            <div style={{ display: 'grid', gridTemplateColumns: `${Math.max(95, finalCardWidth)}px auto`, gap: '12px', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>남은 횟수</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>{state.stepsLeft}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', position: 'relative' }}>
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
                    @keyframes dealCard {
                        0% {
                            transform: translate(var(--deal-from-x, 150px), var(--deal-from-y, -100px)) scale(0.85) rotate(-3deg);
                            opacity: 0.8;
                        }
                        100% {
                            transform: translate(0, 0) scale(1) rotate(0deg);
                            opacity: 1;
                        }
                    }
                    .deal-animation {
                        animation: dealCard 0.3s cubic-bezier(0.2, 0.8, 0.3, 1) forwards !important;
                    }
                    @keyframes tutorialPulse {
                        0%, 100% {
                            outline-color: rgba(74, 222, 128, 0.5);
                            box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
                        }
                        50% {
                            outline-color: #4ade80;
                            box-shadow: 0 0 26px rgba(74, 222, 128, 0.75);
                        }
                    }
                    .tutorial-highlight {
                        animation: tutorialPulse 1.2s ease-in-out infinite !important;
                        outline: 3px solid rgba(74, 222, 128, 0.5);
                        outline-offset: 2px;
                        position: relative;
                        z-index: 200 !important;
                    }
                `}</style>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                        position: 'absolute',
                        right: `${finalCardWidth + 12}px`,
                        top: 0,
                        width: `${finalCardWidth + 84}px`,
                        minHeight: '80px',
                        perspective: '1200px',
                        zIndex: 10
                    }}>
                        {(state.revealedDeck.length === 0 || (state.revealedDeck.length === 1 && draggingGroup?.type === 'deck')) && (
                            <div style={{ ...slotCardStyle, width: `${finalCardWidth}px`, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', position: 'absolute', right: 0 }}>
                                <div style={{ opacity: 0.2, fontSize: '0.7rem' }}>카드 없음</div>
                            </div>
                        )}
                        {state.revealedDeck.length > 0 && state.revealedDeck.slice(-4).map((card, idx, arr) => {
                            const isTop = idx === arr.length - 1;
                            const isDragging = isTop && draggingGroup?.type === 'deck';
                            // 우측 기준: 가장 오래된 것(idx=0)이 right: 0, 최신 것(idx=arr.length-1)이 가장 왼쪽
                            const offsetGap = 28;
                            const offset = idx * offsetGap;
                            const category = state.categories.find(c => c.id === card.cat);

                            // 덱 위치 (슬롯 영역 우측 밖)까지의 거리 계산
                            // 슬롯 위치(offset) + 슬롯 컨테이너 여백(12px) + 덱 카드 폭(finalCardWidth)
                            // 덱 더미의 오른쪽 끝 지점으로 출발점을 잡아야 자연스러움
                            const startX = offset + finalCardWidth + 12;

                            return (
                                <div
                                    key={card.id}
                                    draggable={isTop && tutorialStep !== 2 && tutorialStep !== 4 && tutorialStep !== 5 && tutorialStep !== 6}
                                    onDragStart={(e) => isTop && handleDragStart(e, 'deck', 0)}
                                    onDragEnd={() => !landingGroup && setDraggingGroup(null)}
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
                                        backgroundColor: card.type === 'category' ? '#fff9f2' : '#ffffff',
                                        backgroundImage: 'none',
                                        border: card.type === 'category' ? '3px solid #ff9f43' : '3px solid #999999',
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
                                    <div
                                        className="drag-back-layer"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            backgroundImage: faceDownPattern,
                                            backgroundSize: '100% 100%',
                                            backgroundPosition: 'center',
                                            backgroundRepeat: 'no-repeat',
                                            transform: 'rotateY(180deg)',
                                            backfaceVisibility: 'hidden',
                                            borderRadius: '5px',
                                            zIndex: -1
                                        }}
                                    />

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
                                            position: isTop ? 'static' : 'absolute',
                                            right: isTop ? 'auto' : '2px', // Stay in visible stripe
                                            width: isTop ? 'auto' : `${offsetGap}px`,
                                            fontWeight: '900',
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
                        })}
                    </div>
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

            {/* Slots */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Object.keys(state.activeSlots).length + (tutorialStep === null ? lockedSlots : 0)}, ${finalCardWidth}px)`,
                gap: `${gap}px`,
                marginBottom: '1.5rem',
                maxWidth: 'fit-content',
                marginInline: 'auto'
            }}>
                {tutorialStep === null && Array.from({ length: lockedSlots }).map((_, i) => (
                    <div key={`locked-slot-${i}`} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <div style={{ height: '25px' }} />
                        <div
                            onClick={() => setUnlockConfirm('slot')}
                            style={{
                                ...slotCardStyle,
                                width: `${finalCardWidth}px`,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1.5px dashed rgba(255,255,255,0.25)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                color: 'rgba(255,255,255,0.5)',
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>🔒</span>
                            <span style={{ fontSize: '0.55rem', textAlign: 'center', lineHeight: 1.2 }}>잠금 해제</span>
                            <span style={{ fontSize: '0.6rem', color: '#fda085', fontWeight: '700' }}>🪙 20</span>
                        </div>
                    </div>
                ))}
                {Object.keys(state.activeSlots).map(key => {
                    const i = Number(key);
                    const slot = state.activeSlots[i];

                    return (
                        <div key={i} ref={el => { slotRefs.current[i] = el; }} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {/* Tab Area - Only spacer for alignment (No tab as per request) */}
                            <div style={{ height: '25px' }} />
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={(e) => { handleDrop(e); e.stopPropagation(); }}
                                className={[
                                    completingSlot === i ? 'animate-slot-complete' : '',
                                    tutorialHighlightSlots.has(i) ? 'tutorial-highlight' : ''
                                ].filter(Boolean).join(' ')}
                                style={{
                                    ...slotCardStyle,
                                    backgroundColor: slot ? '#ffffff' : 'rgba(255,255,255,0.03)',
                                    backgroundImage: 'none',
                                    color: '#333',
                                    border: slot
                                        ? '3px solid #ff9f43'
                                        : '1px dashed rgba(255,255,255,0.2)',
                                    opacity: 1,
                                    width: `${finalCardWidth}px`,
                                    boxShadow: slot ? '0 0 15px rgba(255,159,67,0.3)' : 'none',
                                    borderRadius: '6px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {slot ? (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            inset: '2px',
                                            border: '1px solid #ffba75',
                                            borderRadius: '3px',
                                            pointerEvents: 'none',
                                            zIndex: 1
                                        }} />
                                        {/* 내부 상단: '0/4 주방' 형식 및 왕관 아이콘 */}
                                        <div style={{
                                            position: 'absolute', top: '6px', left: '8px', right: '8px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            zIndex: 2
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
                                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#2c3e50', marginTop: '12px', zIndex: 2 }}>
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
                gridTemplateColumns: `repeat(${state.stacks.length + (tutorialStep === null ? lockedStacks : 0)}, ${finalCardWidth}px)`,
                gap: `${gap}px`,
                flex: 1,
                alignItems: 'flex-start',
                maxWidth: 'fit-content',
                marginInline: 'auto'
            }}>
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
                            <span style={{ fontSize: '0.6rem', color: '#fda085', fontWeight: '700' }}>🪙 20</span>
                        </div>
                    </div>
                ))}
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
                        {(stack.length === 0 || (
                            draggingGroup?.type === 'stack' && draggingGroup.index === sIdx &&
                            (draggingGroup.cardIndex ?? 0) === 0 && (draggingGroup.count ?? 1) >= stack.length
                        )) && (
                                <div style={{ ...stackCardStyle, borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)' }} />
                            )}
                        {stack.map((card, cIdx) => {
                            const isRevealed = !!card.isRevealed;
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

                            const isDragging = draggingGroup?.type === 'stack' &&
                                draggingGroup.index === sIdx &&
                                draggingGroup.cardIndex !== undefined &&
                                cIdx >= draggingGroup.cardIndex &&
                                cIdx < draggingGroup.cardIndex + (draggingGroup.count || 1);

                            const isProxyMoving = landingGroup?.isProxy && landingGroup.movingCards?.some(mc => mc.id === card.id);

                            const globalCardIndex = stackStartIndices[sIdx] + cIdx;
                            const isDealtYet = !isDealingAnimation || globalCardIndex < dealingProgress;
                            const isCurrentlyDealing = isDealingAnimation && globalCardIndex < dealingProgress;

                            return (
                                <div
                                    key={cIdx}
                                    draggable={canDrag}
                                    onDragStart={e => canDrag && handleDragStart(e, 'stack', sIdx, cIdx)}
                                    onDragEnd={() => !landingGroup && setDraggingGroup(null)}
                                    onDragOver={e => e.preventDefault()}
                                    className={[
                                        tutorialHighlightCards.has(card.id) ? 'tutorial-highlight' : '',
                                        isCurrentlyDealing ? 'deal-animation' : ''
                                    ].filter(Boolean).join(' ')}
                                    style={{
                                        ...stackCardStyle,
                                        backgroundColor: (isRevealed && card.type === 'category') ? '#fff9f2' : (isRevealed ? '#ffffff' : 'transparent'),
                                        backgroundImage: isRevealed
                                            ? 'none'
                                            : faceDownPattern,
                                        backgroundSize: isRevealed ? 'auto' : '100% 100%',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        color: isRevealed ? '#333' : 'transparent',
                                        marginBottom: cIdx === stack.length - 1 ? '0' : `${currentOverlapMargin}px`,
                                        zIndex: cIdx,
                                        cursor: canDrag ? 'grab' : 'default',
                                        border: isRevealed
                                            ? (card.type === 'category' ? '3px solid #ff9f43' : '3px solid #999999')
                                            : 'none',
                                        boxShadow: (isRevealed && card.type === 'category') ? '0 0 10px rgba(255,159,67,0.2)' : 'none',
                                        visibility: (isDragging || isProxyMoving || !isDealtYet) ? 'hidden' : 'visible',
                                        transform: 'none',
                                        transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)'
                                    }}
                                >
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
                                                justifyContent: cIdx === stack.length - 1 ? 'center' : 'flex-start',
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
                                                    lineHeight: '1.2',
                                                    zIndex: 2
                                                }}>
                                                    {card.value}
                                                </span>
                                            </div>
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
                <div style={{ textAlign: 'center' }}><RotateCcw size={24} onClick={() => {
                    resetUnlocks();
                    if (tutorialStep !== null) {
                        dispatch({ type: 'START_LEVEL', levelData: tutorialLevel });
                        setTutorialStep(1);
                        triggerDealing(levelStackTotal(tutorialLevel));
                    } else {
                        dispatch({ type: 'START_LEVEL', levelData: levels[0] });
                        triggerDealing(levelStackTotal(levels[0]));
                    }
                }} /><div style={{ fontSize: '0.7rem' }}>재시작</div></div>
                <div style={{ textAlign: 'center' }}><LayersIcon size={24} /><div style={{ fontSize: '0.7rem' }}>제거</div></div>
            </div>

            {/* Unlock Confirm Dialog */}
            {unlockConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{
                        background: '#3a3c5a', borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', width: '240px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🔓</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>잠금 해제</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            🪙 20 코인을 사용하여<br />
                            {unlockConfirm === 'stack' ? '스택' : '슬롯'} 공간을 여시겠습니까?
                        </div>
                        {coins < 20 && (
                            <div style={{ fontSize: '0.78rem', color: '#ff6b6b', marginBottom: '0.6rem' }}>
                                코인 부족 (현재 {coins}개)
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setUnlockConfirm(null)}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                            >취소</button>
                            <button
                                onClick={handleUnlockConfirm}
                                disabled={coins < 20}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: coins >= 20 ? 'linear-gradient(135deg, #f6d365, #fda085)' : 'rgba(255,255,255,0.15)', color: 'white', fontWeight: '700', cursor: coins >= 20 ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Win Overlay */}
            {state.isWinner && tutorialStep === null && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <h2 style={{ fontSize: '2.5rem', color: '#f1c40f', marginBottom: '1.5rem' }}>🎉 VICTORY!</h2>
                    <button onClick={() => { resetUnlocks(); dispatch({ type: 'START_LEVEL', levelData: levels[0] }); triggerDealing(levelStackTotal(levels[0])); }} style={{ padding: '0.8rem 2.5rem', fontSize: '1.2rem', borderRadius: '30px', border: 'none', background: '#f39c12', color: 'white', fontWeight: 'bold' }}>재시작</button>
                </div>
            )}

            {/* Interaction blocker during dealing animation */}
            {isDealingAnimation && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} />
            )}

            {/* Interaction blocker for step 1 (welcome screen — must press 다음 first) */}
            {tutorialStep === 1 && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9500 }} />
            )}

            {/* Tutorial Overlay */}
            {tutorialStep !== null && (
                <TutorialOverlay
                    step={tutorialStep}
                    onNext={() => {
                        if (tutorialStep === 1) setTutorialStep(2);
                        else if (tutorialStep === 5) setTutorialStep(6);
                        else if (tutorialStep === 6) setTutorialStep(7);
                        else if (tutorialStep === 8) completeTutorial();
                    }}
                    onSkip={completeTutorial}
                />
            )}

            {/* Shop Modal */}
            {isShopOpen && <CardBackShopModal onClose={() => setIsShopOpen(false)} />}

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
                                    fontSize: card.type === 'category' ? '0.9rem' : '0.85rem',
                                    zIndex: 2
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

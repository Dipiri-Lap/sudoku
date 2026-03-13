import { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { WordSolitaireState } from '../context/WordSortContext';

interface UseGatherAnimationParams {
    state: WordSolitaireState;
    dispatch: React.Dispatch<any>;
    slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    stackRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    setCompletingSlot: React.Dispatch<React.SetStateAction<number | null>>;
    addCoins: (n: number) => void;
    // Additional dependencies required by handleRemoveClick
    isRemoveMode: boolean;
    setIsRemoveMode: React.Dispatch<React.SetStateAction<boolean>>;
    spendCoins: (n: number) => Promise<boolean>;
    finalCardWidth: number;
    cardHeight: number;
    deckCardRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function useGatherAnimation(params: UseGatherAnimationParams) {
    const {
        state,
        dispatch,
        slotRefs,
        stackRefs,
        setCompletingSlot,
        addCoins,
        isRemoveMode,
        setIsRemoveMode,
        spendCoins,
        finalCardWidth,
        cardHeight,
        deckCardRef,
    } = params;

    const [gatheringCat, setGatheringCat] = useState<string | null>(null);
    const [gatherPhase, setGatherPhase] = useState(0);
    const [isRemovingAction, setIsRemovingAction] = useState(false);
    const [removeTargetLocation, setRemoveTargetLocation] = useState<{ x: number, y: number } | null>(null);

    const gatherOffsets = useRef<Map<string, { x: number, y: number, startX: number, startY: number, seq: number, card: any }>>(new Map());

    // Fire confetti + glow animation when a slot completes
    useEffect(() => {
        if (state.lastCompletedSlot === null) return;
        const slotIndex = state.lastCompletedSlot;
        setCompletingSlot(slotIndex);

        const slotEl = slotRefs.current[slotIndex];
        if (slotEl) {
            let x = 0.5, y = 0.5;

            if (isRemovingAction && removeTargetLocation) {
                // If cards gathered somewhere specific (like a slot), explode there
                x = removeTargetLocation.x;
                y = removeTargetLocation.y;
            } else if (!isRemovingAction) {
                // Standard slot complete (not removal)
                const rect = slotEl.getBoundingClientRect();
                x = (rect.left + rect.width / 2) / window.innerWidth;
                y = (rect.top + rect.height / 2) / window.innerHeight;
            }

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
            setIsRemovingAction(false);
            setRemoveTargetLocation(null);
            dispatch({ type: 'CLEAR_COMPLETED_SLOT' });
        }, 900);

        return () => clearTimeout(timer);
    }, [state.lastCompletedSlot, dispatch]);

    const handleRemoveClick = async (catId: string) => {
        if (!isRemoveMode || gatheringCat) return;

        const success = await spendCoins(50);
        if (!success) return;

        // 1. Find the target slot for this category to determine destination
        let targetX = window.innerWidth / 2 - finalCardWidth / 2;
        let targetY = window.innerHeight / 2 - cardHeight / 2;

        const slotEntry = Object.entries(state.activeSlots).find(([_, s]) => s?.catId === catId);
        if (slotEntry) {
            const slotIdx = Number(slotEntry[0]);
            const slotEl = slotRefs.current[slotIdx];
            if (slotEl) {
                const rect = slotEl.getBoundingClientRect();
                // We use fixed top-left of the slot as target
                targetX = rect.left;
                targetY = rect.top;
            }
        }

        setRemoveTargetLocation({
            x: (targetX + finalCardWidth / 2) / window.innerWidth,
            y: (targetY + cardHeight / 2) / window.innerHeight
        });

        const newGatherOffsets = new Map<string, { x: number, y: number, startX: number, startY: number, seq: number, card: any }>();
        let seq = 0;

        const addTarget = (card: any, startXOverride?: number, startYOverride?: number) => {
            if (newGatherOffsets.has(card.id)) return;
            const el = document.querySelector(`[data-card-id="${card.id}"]`);
            let sX = 0, sY = 0;
            if (startXOverride !== undefined && startYOverride !== undefined) {
                sX = startXOverride;
                sY = startYOverride;
            } else if (el) {
                const r = el.getBoundingClientRect();
                sX = r.left;
                sY = r.top;
            } else {
                // Fallback to deck position
                if (deckCardRef.current) {
                    const r = deckCardRef.current.getBoundingClientRect();
                    sX = r.left;
                    sY = r.top;
                } else {
                    // Universal fallback: screen center
                    sX = window.innerWidth / 2 - finalCardWidth / 2;
                    sY = window.innerHeight / 2 - cardHeight / 2;
                }
            }
            newGatherOffsets.set(card.id, {
                startX: sX,
                startY: sY,
                x: targetX,
                y: targetY,
                seq: seq++,
                card
            });
        };

        // Find and add cards in order: Category first, then words
        // 1. Target Slot (The main category card in its destination)
        const targetSlot = Object.entries(state.activeSlots).find(([_, s]) => s?.catId === catId);
        if (targetSlot) {
            const [sIdxString, slot] = targetSlot;
            const slotIdx = Number(sIdxString);
            const slotEl = slotRefs.current[slotIdx];
            if (slotEl && slot) {
                const rect = slotEl.getBoundingClientRect();
                addTarget({ id: `slot-${slotIdx}`, value: slot.name, type: 'category', cat: catId }, rect.left, rect.top);
            }
        }

        // 2. Category in Revealed Deck / Stacks / Draw Pile (if not handled by slot)
        state.revealedDeck.forEach(card => {
            if (card.cat === catId && card.type === 'category' && !newGatherOffsets.has(card.id)) addTarget(card);
        });
        state.stacks.forEach(stack => {
            stack.forEach(card => {
                if (card.cat === catId && card.type === 'category' && !newGatherOffsets.has(card.id)) addTarget(card);
            });
        });
        state.deck.forEach(card => {
            if (card.cat === catId && card.type === 'category' && !newGatherOffsets.has(card.id)) addTarget(card);
        });

        // 3. Words in Stacks (Priority to stacks for gameplay feel)
        state.stacks.forEach(stack => {
            stack.forEach(card => {
                if (card.cat === catId && card.type === 'word') addTarget(card);
            });
        });

        // 4. Words in Revealed Deck
        state.revealedDeck.forEach(card => {
            if (card.cat === catId && card.type === 'word') addTarget(card);
        });

        // 5. Words in Draw Pile
        state.deck.forEach(card => {
            if (card.cat === catId && card.type === 'word') addTarget(card);
        });

        gatherOffsets.current = newGatherOffsets;
        setGatheringCat(catId);
        setGatherPhase(-1); // Start at -1 to ensure mount before movement
        setIsRemovingAction(true);

        // Phase transitions
        // Iterate through all collected cards and trigger their movement phase
        let accumulatedDelay = 0;
        let currentInterval = 400; // Start quite slow

        newGatherOffsets.forEach((info) => {
            const seqNum = info.seq;
            accumulatedDelay += currentInterval;

            // Delay each phase
            setTimeout(() => setGatherPhase(seqNum), accumulatedDelay);

            // Speed up the next interval by 20%, but never faster than 40ms
            currentInterval = Math.max(40, currentInterval * 0.8);
        });

        // After all animations complete, actually remove them from the game state
        setTimeout(() => {
            dispatch({ type: 'REMOVE_CATEGORY', catId: catId });
            setGatheringCat(null);
            setGatherPhase(0);
            setIsRemoveMode(false);
        }, accumulatedDelay + 500); // 500ms buffer to allow the last 0.3s transition to finish
    };

    return {
        gatheringCat,
        setGatheringCat,
        gatherPhase,
        setGatherPhase,
        gatherOffsets,
        handleRemoveClick,
        isRemovingAction,
        removeTargetLocation,
    };
}

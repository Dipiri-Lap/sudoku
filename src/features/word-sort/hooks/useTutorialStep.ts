import { useState, useRef, useEffect } from 'react';
import type { WordSolitaireState } from '../context/WordSortContext';
import levels from '../data/levels.json';

const levelStackTotal = (levelData: any): number => {
    if (levelData.fixedStacks) {
        return levelData.fixedStacks.reduce((s: number, st: any[]) => s + st.length, 0);
    }
    const slots = levelData.slots || 4;
    const counts = slots === 3 ? [3, 4, 5] : slots === 5 ? [3, 4, 5, 6, 7] : [3, 4, 5, 6];
    return counts.reduce((a: number, b: number) => a + b, 0);
};

interface UseTutorialStepParams {
    state: WordSolitaireState;
    dispatch: React.Dispatch<any>;
    triggerDealing: (n: number) => void;
}

export function useTutorialStep(params: UseTutorialStepParams) {
    const { state, dispatch, triggerDealing } = params;

    const [tutorialStep, setTutorialStep] = useState<number | null>(null);

    const prevActiveSlotsRef = useRef(0);
    const prevCollectedRef = useRef(0);
    const prevRevealedDeckRef = useRef(0);
    const prevStepsLeftRef = useRef(0);

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

    const completeTutorial = () => {
        localStorage.setItem('wordSort_tutorialDone', 'true');
        setTutorialStep(null);
        dispatch({ type: 'START_LEVEL', levelData: levels[0] });
        triggerDealing(levelStackTotal(levels[0]));
    };

    // Tutorial highlight sets (computed each render from tutorialStep + state)
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

    return {
        tutorialStep,
        setTutorialStep,
        completeTutorial,
        tutorialHighlightCards,
        tutorialHighlightSlots,
        tutorialHighlightDeck,
    };
}

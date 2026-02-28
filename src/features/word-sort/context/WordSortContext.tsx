import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

export type CardType = 'word' | 'category';

export interface Card {
    id: string;
    type: CardType;
    value: string;
    cat: string;
    isRevealed?: boolean;
}

export interface ActiveSlot {
    catId: string;
    name: string;
    target: number;
    collected: string[];
}

export interface WordSolitaireState {
    level: number;
    stepsLeft: number;
    stacks: Card[][];
    deck: Card[];
    revealedDeck: Card[];
    activeSlots: Record<number, ActiveSlot | null>;
    categories: any[];
    totalCategories: number;
    isGameOver: boolean;
    isWinner: boolean;
    lastCompletedSlot: number | null; // slot index that just completed, for animation trigger
}

export type WordSolitaireAction =
    | { type: 'START_LEVEL'; levelData: any }
    | { type: 'DRAW_DECK' }
    | { type: 'MOVE_CARD'; from: { type: 'stack' | 'deck'; index: number; cardIndex?: number; count?: number }; to: { type: 'slot' | 'stack'; index: number } }
    | { type: 'CLEAR_COMPLETED_SLOT' };

const initialState: WordSolitaireState = {
    level: 1,
    stepsLeft: 0,
    stacks: [],
    deck: [],
    revealedDeck: [],
    activeSlots: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    categories: [],
    totalCategories: 0,
    isGameOver: false,
    isWinner: false,
    lastCompletedSlot: null,
};

function wordSolitaireReducer(state: WordSolitaireState, action: WordSolitaireAction): WordSolitaireState {
    if (state.isGameOver || state.isWinner) return state;

    switch (action.type) {
        case 'START_LEVEL': {
            const level = action.levelData;
            const categories = level.categories || [];
            const slotCount = level.slots || 4; // Use level.slots or default 4

            // 1. Generate all cards
            let categoryCards: Card[] = [];
            let wordCards: Card[] = [];
            let idCounter = 0;

            categories.forEach((cat: any) => {
                categoryCards.push({ id: `c-${idCounter++}`, type: 'category', value: cat.name, cat: cat.id });
                cat.words.forEach((word: string) => {
                    wordCards.push({ id: `w-${idCounter++}`, type: 'word', value: word, cat: cat.id });
                });
            });

            // 2. Shuffle helper
            const shuffle = (array: any[]) => {
                let currentIndex = array.length, randomIndex;
                while (currentIndex > 0) {
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex--;
                    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
                }
                return array;
            };

            shuffle(categoryCards);
            shuffle(wordCards);

            // Determine stack counts
            const stackCounts = slotCount === 3 ? [4, 5, 6] : [4, 5, 6, 7];
            const totalStackCards = stackCounts.reduce((a, b) => a + b, 0);

            // Constraint: strictly less than half → floor((n-1)/2) gives correct max.
            // e.g. 8장 → max 3,  9장 → max 4.  Then randomize between 2 and max (inclusive).
            const totalCatCards = categoryCards.length;
            const maxCatInStack = Math.floor((totalCatCards - 1) / 2); // strictly < half
            const minCatInStack = 2;
            const catInStackCount = minCatInStack + Math.floor(Math.random() * (maxCatInStack - minCatInStack + 1));

            // Pick cards for stacks vs deck
            const stackCatCards = categoryCards.splice(0, catInStackCount);
            // We need to fill the rest of the stacks with word cards
            const neededWordCards = totalStackCards - catInStackCount;
            const stackWordCards = wordCards.splice(0, neededWordCards);

            let stackCards = [...stackCatCards, ...stackWordCards];
            shuffle(stackCards);

            // Remaining cards go to deck
            let newDeck = [...categoryCards, ...wordCards];
            shuffle(newDeck);

            // 3. Distribute to stacks
            const newStacks: Card[][] = Array.from({ length: stackCounts.length }, () => []);

            stackCounts.forEach((count, sIdx) => {
                for (let i = 0; i < count; i++) {
                    if (stackCards.length === 0) break;
                    const card = stackCards.pop()!;
                    newStacks[sIdx].push({
                        ...card,
                        isRevealed: i === count - 1 // Reveal only the top card visually
                    });
                }
            });

            const activeSlots: Record<number, ActiveSlot | null> = {};
            for (let i = 0; i < slotCount; i++) activeSlots[i] = null;

            return {
                ...initialState,
                level: level.id,
                stepsLeft: level.maxMoves || 100,
                stacks: newStacks,
                deck: newDeck,
                categories: categories,
                totalCategories: categories.length,
                activeSlots: activeSlots,
            };
        }

        case 'DRAW_DECK': {
            if (state.stepsLeft <= 0) return state;

            // Recycling logic: if deck is empty, move revealed cards back to deck
            if (state.deck.length === 0) {
                if (state.revealedDeck.length === 0) return state;
                const recycledDeck = [...state.revealedDeck];
                for (let i = recycledDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [recycledDeck[i], recycledDeck[j]] = [recycledDeck[j], recycledDeck[i]];
                }
                return {
                    ...state,
                    deck: recycledDeck,
                    revealedDeck: [],
                    stepsLeft: state.stepsLeft - 1,
                };
            }

            const [card, ...remainingDeck] = state.deck;
            return {
                ...state,
                deck: remainingDeck,
                revealedDeck: [...state.revealedDeck, { ...card, isRevealed: true }],
                stepsLeft: state.stepsLeft - 1,
            };
        }

        case 'MOVE_CARD': {
            const { from, to } = action;
            let movingCards: Card[] = [];

            if (from.type === 'stack') {
                const stack = state.stacks[from.index];
                if (!stack) return state;
                if (from.cardIndex !== undefined) {
                    // count가 지정되지 않으면 기존처럼 끝까지 가져옴
                    const count = from.count || (stack.length - from.cardIndex);
                    const cardsToMove = stack.slice(from.cardIndex, from.cardIndex + count);
                    if (cardsToMove.some(c => !c.isRevealed)) return state;
                    movingCards = cardsToMove;
                } else {
                    const topCard = stack[stack.length - 1];
                    if (!topCard.isRevealed) return state;
                    movingCards = [topCard];
                }
            } else {
                if (state.revealedDeck.length === 0) return state;
                const topCard = state.revealedDeck[state.revealedDeck.length - 1];
                if (!topCard.isRevealed) return state;
                movingCards = [topCard];
            }

            if (movingCards.length === 0) return state;

            // Target is a SLOT
            if (to.type === 'slot') {
                const slot = state.activeSlots[to.index];

                // Case 1: Category Opener (Base Setup)
                if (movingCards[0].type === 'category') {
                    if (movingCards.length > 1) return state;
                    if (slot !== null) return state;

                    const card = movingCards[0];
                    const catDef = state.categories.find(c => c.id === card.cat);
                    // The target is words count ONLY (opener is the base, not counted)
                    const targetCount = catDef ? catDef.words.length : 4;

                    const newSlots = { ...state.activeSlots };
                    newSlots[to.index] = { catId: card.cat, name: card.value, target: targetCount, collected: [] };
                    return updateStateAfterMove(state, from, { slots: newSlots }, movingCards.length);
                }

                // Case 2: Word Cards (Filling the Base)
                if (movingCards[0].type === 'word') {
                    if (!slot) return state;
                    if (movingCards.some(c => c.cat !== slot.catId)) return state;

                    const newSlots = { ...state.activeSlots };
                    const nextCollected = [...slot.collected, ...movingCards.map(c => c.value)];

                    // Check if everything is collected (words total)
                    const isComplete = nextCollected.length >= slot.target;
                    if (isComplete) {
                        newSlots[to.index] = null; // Auto-clear
                    } else {
                        newSlots[to.index] = { ...slot, collected: nextCollected };
                    }
                    const afterMove = updateStateAfterMove(state, from, { slots: newSlots }, movingCards.length);
                    return { ...afterMove, lastCompletedSlot: isComplete ? to.index : null };
                }
            }

            // Target is a STACK
            if (to.type === 'stack') {
                if (from.type === 'stack' && from.index === to.index) return state;
                const targetStack = state.stacks[to.index] || [];

                if (targetStack.length > 0) {
                    const topTarget = targetStack[targetStack.length - 1];
                    // Standard solitaire rule: must match category
                    // NEW: Cannot drop anything on top of a base (category) card in stacks
                    if (topTarget.type === 'category' || topTarget.cat !== movingCards[0].cat) return state;
                }

                const newStacks = [...state.stacks];
                newStacks[to.index] = [...targetStack, ...movingCards];
                return updateStateAfterMove(state, from, { stacks: newStacks }, movingCards.length);
            }

            return state;
        }

        case 'CLEAR_COMPLETED_SLOT':
            return { ...state, lastCompletedSlot: null };

        default:
            return state;
    }
}

function updateStateAfterMove(
    state: WordSolitaireState,
    from: { type: 'stack' | 'deck'; index: number; cardIndex?: number; count?: number },
    changes: { slots?: Record<number, ActiveSlot | null>; stacks?: Card[][] },
    moveCount: number
): WordSolitaireState {
    let newStacks = changes.stacks || [...state.stacks];
    let newRevealedDeck = [...state.revealedDeck];
    let newSlots = changes.slots || state.activeSlots;

    if (from.type === 'stack') {
        const stackIndex = from.index;
        const stack = [...(newStacks[stackIndex] || [])];
        const startIndex = from.cardIndex ?? (stack.length - moveCount);
        const count = from.count ?? moveCount;

        // Remove the specific slice from the stack
        stack.splice(startIndex, count);

        // SOLITAIRE RULE: If the stack top is now hidden, flip it
        if (stack.length > 0 && !stack[stack.length - 1].isRevealed) {
            stack[stack.length - 1] = { ...stack[stack.length - 1], isRevealed: true };
        }
        newStacks[stackIndex] = stack;
    } else {
        newRevealedDeck = newRevealedDeck.slice(0, -moveCount);
    }

    const isWinner = newStacks.every(s => s.length === 0) &&
        state.deck.length === 0 &&
        newRevealedDeck.length === 0 &&
        Object.values(newSlots).every(s => !s || s.collected.length >= s.target);

    return {
        ...state,
        stacks: newStacks,
        revealedDeck: newRevealedDeck,
        activeSlots: newSlots,
        stepsLeft: state.stepsLeft - 1,
        isWinner,
        isGameOver: state.stepsLeft - 1 <= 0 && !isWinner
    };
}

const WordSortContext = createContext<{
    state: WordSolitaireState;
    dispatch: React.Dispatch<WordSolitaireAction>;
} | null>(null);

export const WordSortProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(wordSolitaireReducer, initialState);
    return <WordSortContext.Provider value={{ state, dispatch }}>{children}</WordSortContext.Provider>;
};

export const useWordSort = () => {
    const context = useContext(WordSortContext);
    if (!context) throw new Error('useWordSort must be used within WordSortProvider');
    return context;
};

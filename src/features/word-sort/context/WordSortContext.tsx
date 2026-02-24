import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

export type CardType = 'word' | 'category';

export interface Card {
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
}

export type WordSolitaireAction =
    | { type: 'START_LEVEL'; levelData: any }
    | { type: 'DRAW_DECK' }
    | { type: 'MOVE_CARD'; from: { type: 'stack' | 'deck'; index: number; cardIndex?: number; count?: number }; to: { type: 'slot' | 'stack'; index: number } };

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
};

function wordSolitaireReducer(state: WordSolitaireState, action: WordSolitaireAction): WordSolitaireState {
    if (state.isGameOver || state.isWinner) return state;

    switch (action.type) {
        case 'START_LEVEL': {
            const level = action.levelData;
            const categories = level.categories || [];

            // 1. Generate all cards from category definitions
            let allCards: Card[] = [];
            categories.forEach((cat: any) => {
                // Add the category opener card
                allCards.push({ type: 'category', value: cat.name, cat: cat.id });
                // Add the word cards
                cat.words.forEach((word: string) => {
                    allCards.push({ type: 'word', value: word, cat: cat.id });
                });
            });

            // 2. Shuffle all cards
            for (let i = allCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
            }

            // 3. Distribute to 3 stacks with specific counts (4, 4, 3)
            const stackCounts = [4, 4, 3];
            const newStacks: Card[][] = Array.from({ length: stackCounts.length }, () => []);

            stackCounts.forEach((count, sIdx) => {
                for (let i = 0; i < count; i++) {
                    if (allCards.length === 0) break;
                    const card = allCards.pop()!;
                    newStacks[sIdx].push({
                        ...card,
                        isRevealed: i === count - 1 // Reveal only the top card visually (last in array)
                    });
                }
            });

            // 4. Remaining cards go to the deck
            const newDeck = [...allCards];

            return {
                ...initialState,
                level: level.id,
                stepsLeft: level.maxMoves,
                stacks: newStacks,
                deck: newDeck,
                categories: categories,
                totalCategories: categories.length,
                activeSlots: { 0: null, 1: null, 2: null },
            };
        }

        case 'DRAW_DECK': {
            if (state.stepsLeft <= 0) return state;

            // Recycling logic: if deck is empty, move revealed cards back to deck
            if (state.deck.length === 0) {
                if (state.revealedDeck.length === 0) return state;
                return {
                    ...state,
                    deck: [...state.revealedDeck],
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
                    if (nextCollected.length >= slot.target) {
                        newSlots[to.index] = null; // Auto-clear
                    } else {
                        newSlots[to.index] = { ...slot, collected: nextCollected };
                    }
                    return updateStateAfterMove(state, from, { slots: newSlots }, movingCards.length);
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

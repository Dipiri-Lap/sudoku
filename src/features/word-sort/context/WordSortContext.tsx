import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

export type CardType = 'word' | 'category';

export interface Card {
    type: CardType;
    value: string;
    cat: string;
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
    totalCategories: number;
    isGameOver: boolean;
    isWinner: boolean;
}

export type WordSolitaireAction =
    | { type: 'START_LEVEL'; levelData: any }
    | { type: 'DRAW_DECK' }
    | { type: 'MOVE_CARD'; from: { type: 'stack' | 'deck'; index: number; cardIndex?: number }; to: { type: 'slot' | 'stack'; index: number } };

const initialState: WordSolitaireState = {
    level: 1,
    stepsLeft: 0,
    stacks: [],
    deck: [],
    revealedDeck: [],
    activeSlots: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    totalCategories: 0,
    isGameOver: false,
    isWinner: false,
};

function wordSolitaireReducer(state: WordSolitaireState, action: WordSolitaireAction): WordSolitaireState {
    if (state.isGameOver || state.isWinner) return state;

    switch (action.type) {
        case 'START_LEVEL': {
            const level = action.levelData;
            return {
                ...initialState,
                level: level.id,
                stepsLeft: level.maxMoves,
                stacks: level.stacks || [],
                deck: level.deck || [],
                totalCategories: level.categories?.length || 0,
                activeSlots: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
            };
        }

        case 'DRAW_DECK': {
            if (state.deck.length === 0 || state.stepsLeft <= 0) return state;
            const [card, ...remainingDeck] = state.deck;
            return {
                ...state,
                deck: remainingDeck,
                revealedDeck: [...state.revealedDeck, card],
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
                    movingCards = stack.slice(from.cardIndex);
                } else {
                    movingCards = [stack[stack.length - 1]];
                }
            } else {
                if (state.revealedDeck.length === 0) return state;
                movingCards = [state.revealedDeck[state.revealedDeck.length - 1]];
            }

            if (movingCards.length === 0) return state;

            // Target is a SLOT
            if (to.type === 'slot') {
                if (movingCards.length > 1) return state;
                const card = movingCards[0];
                const slot = state.activeSlots[to.index];

                if (card.type === 'category') {
                    if (slot !== null) return state;
                    const newSlots = { ...state.activeSlots };
                    newSlots[to.index] = { catId: card.cat, name: card.value, target: 4, collected: [] };
                    return updateStateAfterMove(state, from, { slots: newSlots }, movingCards.length);
                }

                if (card.type === 'word') {
                    if (!slot || slot.catId !== card.cat) return state;
                    const newSlots = { ...state.activeSlots };
                    newSlots[to.index] = { ...slot, collected: [...slot.collected, card.value] };
                    return updateStateAfterMove(state, from, { slots: newSlots }, movingCards.length);
                }
            }

            // Target is a STACK
            if (to.type === 'stack') {
                if (from.type === 'stack' && from.index === to.index) return state;
                const targetStack = state.stacks[to.index] || [];

                if (targetStack.length > 0) {
                    const topTarget = targetStack[targetStack.length - 1];
                    if (topTarget.cat !== movingCards[0].cat) return state;
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
    from: { type: 'stack' | 'deck'; index: number },
    changes: { slots?: Record<number, ActiveSlot | null>; stacks?: Card[][] },
    moveCount: number
): WordSolitaireState {
    let newStacks = changes.stacks || [...state.stacks];
    let newRevealedDeck = [...state.revealedDeck];
    let newSlots = changes.slots || state.activeSlots;

    if (from.type === 'stack') {
        const stackIndex = from.index;
        newStacks[stackIndex] = (newStacks[stackIndex] || []).slice(0, -moveCount);
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

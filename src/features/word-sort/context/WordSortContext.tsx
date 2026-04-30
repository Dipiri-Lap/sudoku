import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

export const WORDSORT_SAVE_KEY = 'wordSort_saveData';

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
    isTutorial: boolean;
    stepsLeft: number;
    stacks: Card[][];
    deck: Card[];
    revealedDeck: Card[];
    activeSlots: Record<number, ActiveSlot | null>;
    categories: any[];
    totalCategories: number;
    isGameOver: boolean;
    isWinner: boolean;
    isStepsPurchased: boolean;
    lockedStacks: number;
    lockedSlots: number;
    lastCompletedSlot: number | null; // slot index that just completed, for animation trigger
    history: Omit<WordSolitaireState, 'history'>[]; // state snapshots for Undo
    language: 'ko' | 'en';
}

export type WordSolitaireAction =
    | { type: 'START_LEVEL'; levelData: any }
    | { type: 'DRAW_DECK' }
    | { type: 'MOVE_CARD'; from: { type: 'stack' | 'deck'; index: number; cardIndex?: number; count?: number }; to: { type: 'slot' | 'stack'; index: number } }
    | { type: 'CLEAR_COMPLETED_SLOT' }
    | { type: 'UNLOCK_STACK' }
    | { type: 'UNLOCK_SLOT' }
    | { type: 'REMOVE_CATEGORY'; catId: string }
    | { type: 'ADD_STEPS'; count: number }
    | { type: 'RESTORE_GAME'; savedState: WordSolitaireState }
    | { type: 'UNDO_ACTION' }
    | { type: 'SET_LANGUAGE'; language: 'ko' | 'en'; newLevelData?: any };

const initialState: WordSolitaireState = {
    level: 1,
    isTutorial: false,
    stepsLeft: 0,
    stacks: [],
    deck: [],
    revealedDeck: [],
    activeSlots: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    categories: [],
    totalCategories: 0,
    isGameOver: false,
    isWinner: false,
    isStepsPurchased: false,
    lockedStacks: 1,
    lockedSlots: 1,
    lastCompletedSlot: null,
    history: [],
    language: (localStorage.getItem('wordSort_language') as 'ko' | 'en') || 'ko',
};

function wordSolitaireReducer(state: WordSolitaireState, action: WordSolitaireAction): WordSolitaireState {
    switch (action.type) {
        case 'START_LEVEL': {
            const level = action.levelData;
            const categories = level.categories || [];
            const slotCount = level.slots || 4;

            // Fixed layout for tutorial
            if (level.fixedStacks && level.fixedDeck) {
                const activeSlots: Record<number, ActiveSlot | null> = {};
                for (let i = 0; i < slotCount; i++) activeSlots[i] = null;
                return {
                    ...initialState,
                    level: level.id,
                    isTutorial: true,
                    stepsLeft: level.maxMoves || 30,
                    stacks: level.fixedStacks as Card[][],
                    deck: level.fixedDeck as Card[],
                    categories,
                    totalCategories: categories.length,
                    activeSlots,
                    lockedStacks: 1,
                    lockedSlots: 1,
                    isStepsPurchased: false,
                };
            }

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

            // Determine stack counts based on slot count
            const stackCounts = slotCount === 3 ? [3, 4, 5] : slotCount === 5 ? [3, 4, 5, 6, 7] : [3, 4, 5, 6];
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
                lockedStacks: 1,
                lockedSlots: 1,
                isStepsPurchased: false,
                language: state.language,
            };
        }

        case 'SET_LANGUAGE': {
            localStorage.setItem('wordSort_language', action.language);
            
            if (!action.newLevelData || state.stacks.length === 0) {
                return {
                    ...state,
                    language: action.language
                };
            }

            const oldCategories = state.categories || [];
            const newCategories = action.newLevelData.categories || [];
            
            const translateCard = (card: Card): Card => {
                const oldCat = oldCategories.find((c: any) => c.id === card.cat);
                const newCat = newCategories.find((c: any) => c.id === card.cat);
                if (!oldCat || !newCat) return card;

                if (card.type === 'category') {
                    return { ...card, value: newCat.name };
                } else if (card.type === 'word') {
                    const wordIndex = oldCat.words.indexOf(card.value);
                    if (wordIndex !== -1 && newCat.words[wordIndex]) {
                        return { ...card, value: newCat.words[wordIndex] };
                    }
                }
                return card;
            };

            const translateActiveSlot = (slot: ActiveSlot | null): ActiveSlot | null => {
                if (!slot) return null;
                const oldCat = oldCategories.find((c: any) => c.id === slot.catId);
                const newCat = newCategories.find((c: any) => c.id === slot.catId);
                if (!oldCat || !newCat) return slot;

                return {
                    ...slot,
                    name: newCat.name,
                    collected: slot.collected.map(word => {
                        const wordIndex = oldCat.words.indexOf(word);
                        return wordIndex !== -1 && newCat.words[wordIndex] ? newCat.words[wordIndex] : word;
                    })
                };
            };

            return {
                ...state,
                language: action.language,
                categories: newCategories,
                stacks: state.stacks.map(stack => stack.map(translateCard)),
                deck: state.deck.map(translateCard),
                revealedDeck: state.revealedDeck.map(translateCard),
                activeSlots: Object.fromEntries(
                    Object.entries(state.activeSlots).map(([k, v]) => [k, translateActiveSlot(v as ActiveSlot | null)])
                ),
                history: state.history.map(h => ({
                    ...h,
                    language: action.language,
                    categories: newCategories,
                    stacks: h.stacks.map(stack => stack.map(translateCard)),
                    deck: h.deck.map(translateCard),
                    revealedDeck: h.revealedDeck.map(translateCard),
                    activeSlots: Object.fromEntries(
                        Object.entries(h.activeSlots).map(([k, v]) => [k, translateActiveSlot(v as ActiveSlot | null)])
                    ),
                }))
            };
        }

        case 'DRAW_DECK': {
            if (state.isGameOver || state.isWinner) return state;
            if (state.stepsLeft <= 0) return state;

            const snapshot = { ...state };
            // @ts-ignore
            delete snapshot.history;
            const newHistory = [...state.history, snapshot];

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
                    isGameOver: state.stepsLeft - 1 <= 0,
                    history: newHistory,
                };
            }

            const [card, ...remainingDeck] = state.deck;
            return {
                ...state,
                deck: remainingDeck,
                revealedDeck: [...state.revealedDeck, { ...card, isRevealed: true }],
                stepsLeft: state.stepsLeft - 1,
                isGameOver: state.stepsLeft - 1 <= 0,
                history: newHistory,
            };
        }

        case 'MOVE_CARD': {
            if (state.isGameOver || state.isWinner) return state;
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


        case 'REMOVE_CATEGORY': {
            const { catId } = action;
            const catDef = state.categories.find(c => c.id === catId);
            if (!catDef) return state;

            // 1. Remove all cards of this category from stacks, deck, and revealedDeck
            let newStacks = state.stacks.map(stack => {
                const filtered = stack.filter(card => card.cat !== catId);
                // Reveal top card if it was hidden
                if (filtered.length > 0 && !filtered[filtered.length - 1].isRevealed) {
                    filtered[filtered.length - 1] = { ...filtered[filtered.length - 1], isRevealed: true };
                }
                return filtered;
            });

            const newDeck = state.deck.filter(card => card.cat !== catId);
            const newRevealedDeck = state.revealedDeck.filter(card => card.cat !== catId);

            // 2. Find or update slot
            let newSlots = { ...state.activeSlots };
            let targetSlotIndex = -1;
            
            // Look for existing slot
            for (const [key, slot] of Object.entries(newSlots)) {
                if (slot?.catId === catId) {
                    targetSlotIndex = Number(key);
                    break;
                }
            }

            // If no existing slot, find an empty one
            if (targetSlotIndex === -1) {
                for (const [key, slot] of Object.entries(newSlots)) {
                    if (slot === null) {
                        targetSlotIndex = Number(key);
                        break;
                    }
                }
            }

            // If still no slot, the category cards are just removed (edge case)
            if (targetSlotIndex !== -1) {
                newSlots[targetSlotIndex] = null; // Mark as "completed" by auto-clearing
            }

            const isWinner = newStacks.every(s => s.length === 0) &&
                newDeck.length === 0 &&
                newRevealedDeck.length === 0 &&
                Object.values(newSlots).every(s => !s || s.collected.length >= s.target);

            return {
                ...state,
                stacks: newStacks,
                deck: newDeck,
                revealedDeck: newRevealedDeck,
                activeSlots: newSlots,
                lastCompletedSlot: targetSlotIndex !== -1 ? targetSlotIndex : null,
                isWinner,
                isGameOver: state.stepsLeft <= 0 && !isWinner
            };
        }

        case 'UNDO_ACTION': {
            if (state.history.length === 0) return state;
            const previousState = state.history[state.history.length - 1];
            return {
                ...previousState,
                history: state.history.slice(0, -1)
            };
        }

        case 'ADD_STEPS': {
            if (state.isStepsPurchased) return state;
            return {
                ...state,
                stepsLeft: state.stepsLeft + action.count,
                isStepsPurchased: true,
                isGameOver: false // Resume if it was game over
            };
        }

        case 'RESTORE_GAME': {
            return {
                ...action.savedState,
                history: [] // Clear history on restore to keep it simple and clean
            };
        }

        case 'UNLOCK_STACK': {
            return {
                ...state,
                stacks: [[], ...state.stacks],
                lockedStacks: Math.max(0, state.lockedStacks - 1)
            };
        }

        case 'UNLOCK_SLOT': {
            const keys = Object.keys(state.activeSlots).map(Number);
            const minIndex = keys.length > 0 ? Math.min(...keys) : 1;
            const newIndex = minIndex - 1;
            return {
                ...state,
                activeSlots: { [newIndex]: null, ...state.activeSlots },
                lockedSlots: Math.max(0, state.lockedSlots - 1)
            };
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

    const snapshot = { ...state };
    // @ts-ignore
    delete snapshot.history;
    const newHistory = [...state.history, snapshot];

    return {
        ...state,
        stacks: newStacks,
        revealedDeck: newRevealedDeck,
        activeSlots: newSlots,
        stepsLeft: state.stepsLeft - 1,
        isWinner,
        isGameOver: state.stepsLeft - 1 <= 0 && !isWinner,
        history: newHistory
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

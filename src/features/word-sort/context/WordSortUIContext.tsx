import React, { createContext, useContext } from 'react';

interface WordSortUIContextType {
    // Card sizing
    finalCardWidth: number;
    cardHeight: number;
    visibleHeight: number;
    cardTextSize: number;
    cardBadgeSize: string;
    cardNameSize: string;
    cardWordSize: string;
    // Card styles
    stackCardStyle: React.CSSProperties;
    slotCardStyle: React.CSSProperties;
    faceDownPattern: string;
    // Drag state
    draggingGroup: any;
    setDraggingGroup: (g: any) => void;
    dragGhostPos: { x: number; y: number } | null;
    setDragGhostPos: (p: { x: number; y: number } | null) => void;
    landingGroup: any;
    setLandingGroup: (g: any) => void;
    nearestValidTarget: { type: 'slot' | 'stack'; index: number } | null;
    setNearestValidTarget: (t: { type: 'slot' | 'stack'; index: number } | null) => void;
    nearestTarget: { type: 'slot' | 'stack'; index: number } | null;
    setNearestTarget: (t: { type: 'slot' | 'stack'; index: number } | null) => void;
    invalidDropTarget: { type: 'slot' | 'stack'; index: number } | null;
    handleDragStart: (e: React.DragEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => void;
    handleDragMove: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleTouchStart: (e: React.TouchEvent, type: 'stack' | 'deck', index: number, cardIndex?: number) => void;
    handleTouchMove: (e: React.TouchEvent) => void;
    handleTouchEnd: (e: React.TouchEvent) => void;
    handleTouchCancel: () => void;
    // Tutorial
    tutorialStep: number | null;
    setTutorialStep: (s: number | null) => void;
    tutorialHighlightCards: Set<string>;
    tutorialHighlightSlots: Set<number>;
    tutorialHighlightDeck: boolean;
    completeTutorial: () => void;
    // Gather
    gatheringCat: string | null;
    gatherPhase: number;
    gatherOffsets: React.MutableRefObject<Map<string, { seq: number; x: number; y: number }>>;
    handleRemoveClick: (catId: string) => void;
    isRemovingAction: boolean;
    removeTargetLocation: { x: number; y: number } | null;
    // UI modes
    isRemoveMode: boolean;
    setIsRemoveMode: (v: boolean) => void;
    completingSlot: number | null;
    showGameOverOverlay: boolean;
    // Coins
    coins: number;
    spendCoins: (n: number) => Promise<boolean>;
    addCoins: (n: number) => void;
    // Volume Settings
    bgmVolume: number;
    setBgmVolume: (v: number) => void;
    sfxVolume: number;
    setSfxVolume: (v: number) => void;
    // Text Size
    textSizeMultiplier: number;
    setTextSizeMultiplier: (v: number) => void;
    // Language
    language: 'ko' | 'en';
    setLanguage: (l: 'ko' | 'en') => void;
    // Refs
    stackRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    slotRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
    deckCardRef: React.MutableRefObject<HTMLDivElement | null>;
    // Handlers
    drawDeck: () => void;
    splitText: (value: string) => React.ReactNode;
    setUnlockConfirm: (v: 'stack' | 'slot' | null) => void;
    setShowMoveConfirm: (v: boolean) => void;
    setShowUndoConfirm: (v: boolean) => void;
    setShowRemoveConfirm: (v: boolean) => void;
    // Dealing animation
    isDealingAnimation: boolean;
    dealingProgress: number;
    lastDrawnId: string | null;
    stackStartIndices: number[];
    // triggerDealing
    triggerDealing: (n: number) => void;
}

const WordSortUIContext = createContext<WordSortUIContextType | null>(null);

export const WordSortUIProvider: React.FC<{ value: WordSortUIContextType; children: React.ReactNode }> = ({ value, children }) => (
    <WordSortUIContext.Provider value={value}>
        {children}
    </WordSortUIContext.Provider>
);

export const useWordSortUI = () => {
    const ctx = useContext(WordSortUIContext);
    if (!ctx) throw new Error('useWordSortUI must be used within WordSortUIProvider');
    return ctx;
};

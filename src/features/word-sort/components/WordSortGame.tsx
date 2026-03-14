import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWordSort, WORDSORT_SAVE_KEY } from '../context/WordSortContext';
import levels from '../data/levels.json';
import tutorialLevel from '../data/tutorial-level.json';
import { useCoins } from '../../../context/CoinContext';
import CoinDisplay from '../../../common/components/CoinDisplay';
import { useCardBacks, cardBackDesigns } from '../context/CardBackContext';
import CardBackShopModal from './CardBackShopModal';
import GlobalOverlay from './board/GlobalOverlay';
import { useWordSortDrag } from '../hooks/useWordSortDrag';
import { useGatherAnimation } from '../hooks/useGatherAnimation';
import { useTutorialStep } from '../hooks/useTutorialStep';
import { WordSortUIProvider } from '../context/WordSortUIContext';
import { DragGhost } from './DragGhost';
import { LandingAnimation } from './LandingAnimation';
import { GameBottomMenu } from './GameBottomMenu';
import { GameOverlays } from './GameOverlays';
import { DeckArea } from './DeckArea';
import { SlotArea } from './SlotArea';
import { StackArea } from './StackArea';
import { Sparkles } from 'lucide-react';



const WordSortGame: React.FC = () => {

    const { state, dispatch } = useWordSort();
    const location = useLocation();
    const { addCoins, spendCoins, coins } = useCoins();
    const hasAwardedCoins = useRef(false);
    const hasSavedLevelProgress = useRef(false);

    const { lockedStacks, lockedSlots } = state;
    const [unlockConfirm, setUnlockConfirm] = useState<'stack' | 'slot' | null>(null);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isRemoveMode, setIsRemoveMode] = useState(false);
    const [showMoveConfirm, setShowMoveConfirm] = useState(false);
    const [showResumeConfirm, setShowResumeConfirm] = useState(false);
    const [pendingSavedState, setPendingSavedState] = useState<any>(null);

    const { selectedBackId } = useCardBacks();
    const currentCardBack = cardBackDesigns.find((cb: any) => cb.id === selectedBackId) || cardBackDesigns[0];


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
    // Proportional font sizes that scale with card width (36–110px range)
    const cardTextSize = Math.max(0.5, Math.min(0.92, finalCardWidth * 0.007 + 0.38));
    const cardBadgeSize = `${(cardTextSize * 0.70).toFixed(2)}rem`;
    const cardNameSize  = `${(cardTextSize * 0.83).toFixed(2)}rem`;
    const cardWordSize  = `${(cardTextSize * (activeSlotCount >= 5 ? 0.95 : 1.15)).toFixed(2)}rem`;
    const visibleHeight = 25; // Height of the visible strip for overlapped cards

    const [lastDrawnId, setLastDrawnId] = useState<string | null>(null);
    const [prevRevealedCount, setPrevRevealedCount] = useState(0);

    const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
    const stackRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [completingSlot, setCompletingSlot] = useState<number | null>(null);
    const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);
    const gameOverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const splitText = (value: string) => {
        if (value.length < 5) return <>{value}</>;
        const firstLine = Math.ceil(value.length / 2);
        return <>{value.slice(0, firstLine)}<br />{value.slice(firstLine)}</>;
    };

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

    // Hook: tutorial step management
    const { tutorialStep, setTutorialStep, completeTutorial, tutorialHighlightCards, tutorialHighlightSlots, tutorialHighlightDeck } = useTutorialStep({ state, dispatch, triggerDealing });

    // Hook: gather/remove animation
    const { gatheringCat, setGatheringCat, gatherPhase, setGatherPhase, gatherOffsets, handleRemoveClick, isRemovingAction, removeTargetLocation } = useGatherAnimation({ state, dispatch, slotRefs, stackRefs, setCompletingSlot, addCoins, isRemoveMode, setIsRemoveMode, spendCoins, finalCardWidth, cardHeight, deckCardRef });

    // Hook: drag and drop
    const { draggingGroup, setDraggingGroup, dragGhostPos, setDragGhostPos, landingGroup, setLandingGroup, nearestValidTarget, setNearestValidTarget, handleDragStart, handleDragMove, handleDrop } = useWordSortDrag({ state, dispatch, tutorialStep, gatheringCat, stackRefs, slotRefs, finalCardWidth, cardHeight, visibleHeight });

    // Award coins on win (not tutorial)
    useEffect(() => {
        if (state.isWinner && tutorialStep === null && !hasAwardedCoins.current) {
            hasAwardedCoins.current = true;
            addCoins(10);
            import('../../../firebase').then(({ auth }) => {
                if (auth.currentUser) {
                    const uid = auth.currentUser!.uid;
                    import('../../../services/rankingService').then(m => {
                        m.incrementPuzzlePower(uid).catch(console.error);
                        // Save cleared level progress (only once per win)
                        if (!hasSavedLevelProgress.current) {
                            hasSavedLevelProgress.current = true;
                            m.saveWordSortProgress(uid, state.level).catch(console.error);
                        }
                    });
                }
            });
        }
    }, [state.isWinner, tutorialStep, addCoins, state.level]);

    // Reset coin award and level progress save flags on new game
    useEffect(() => {
        if (!state.isWinner) {
            hasAwardedCoins.current = false;
            hasSavedLevelProgress.current = false;
        }
    }, [state.isWinner]);

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
    }, [dealingProgress, isDealingAnimation, finalCardWidth, cardHeight, visibleHeight, state.stacks]);

    const levelStackTotal = (levelData: any): number => {
        if (levelData.fixedStacks) {
            return levelData.fixedStacks.reduce((s: number, st: any[]) => s + st.length, 0);
        }
        const slots = levelData.slots || 4;
        const counts = slots === 3 ? [3, 4, 5] : slots === 5 ? [3, 4, 5, 6, 7] : [3, 4, 5, 6];
        return counts.reduce((a: number, b: number) => a + b, 0);
    };

    // Synchronous calibration check to prevent "target location" flash
    if (state.revealedDeck.length > prevRevealedCount) {
        setLastDrawnId(state.revealedDeck[state.revealedDeck.length - 1].id);
        setPrevRevealedCount(state.revealedDeck.length);
    } else if (state.revealedDeck.length < prevRevealedCount) {
        setPrevRevealedCount(state.revealedDeck.length);
    }

    // Auto-save effect
    useEffect(() => {
        if (!state || state.isTutorial) return;

        // Don't save if game is over or won
        if (state.isGameOver || state.isWinner) {
            localStorage.removeItem(WORDSORT_SAVE_KEY);
            return;
        }

        // Exclude history to keep data small
        const { history, ...stateToSave } = state;

        // Only save if the game has actually started (e.g., stacks are generated)
        if (stateToSave.stacks.length > 0) {
            localStorage.setItem(WORDSORT_SAVE_KEY, JSON.stringify(stateToSave));
        }
    }, [state]);

    // Unified initialization: check URL query first, then Firebase progress, then restore
    useEffect(() => {
        const doInit = async () => {
            const tutorialDone = localStorage.getItem('wordSort_tutorialDone');

            // 1. Check URL query params first (for refresh/direct link level transitions)
            const params = new URLSearchParams(location.search);
            const urlLevelStr = params.get('level');
            const urlLevel = urlLevelStr ? parseInt(urlLevelStr) : null;

            if (urlLevel !== null && !isNaN(urlLevel)) {
                // If specific level requested via URL, start it (skips tutorial/restore)
                const levelData = levels.find((l: any) => l.id === urlLevel) || levels[0];
                dispatch({ type: 'START_LEVEL', levelData });
                triggerDealing(levelStackTotal(levelData));
                return;
            }

            if (!tutorialDone) {
                dispatch({ type: 'START_LEVEL', levelData: tutorialLevel });
                setTutorialStep(1);
                triggerDealing(levelStackTotal(tutorialLevel));
                return;
            }

            // Wait for Firebase auth state to be resolved
            let clearedLevel = 0;
            try {
                const { auth } = await import('../../../firebase');
                const user = await new Promise<any>((resolve) => {
                    const unsubscribe = auth.onAuthStateChanged((u) => {
                        unsubscribe();
                        resolve(u);
                    });
                });
                if (user) {
                    const { getWordSortProgress } = await import('../../../services/rankingService');
                    clearedLevel = await getWordSortProgress(user.uid);
                }
            } catch (e) {
                console.error('Failed to load wordSort progress:', e);
            }

            // Check localStorage — only restore if it's a level NOT yet cleared
            const savedData = localStorage.getItem(WORDSORT_SAVE_KEY);
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    if (parsed && parsed.stacks?.length > 0 && !parsed.isTutorial) {
                        // Only restore if the saved level is beyond what's been cleared
                        if (clearedLevel === 0 || (parsed.level ?? 1) > clearedLevel) {
                            // Validate stack count matches current level config
                            const savedLevelData = levels.find((l: any) => l.id === parsed.level);
                            const expectedSlots = savedLevelData?.slots || 4;
                            const expectedStacks = expectedSlots === 3 ? 3 : expectedSlots === 5 ? 5 : 4;
                            if (parsed.stacks.length === expectedStacks) {
                                dispatch({ type: 'RESTORE_GAME', savedState: parsed });
                                return;
                            }
                            // Stack count mismatch (old save) — discard
                            localStorage.removeItem(WORDSORT_SAVE_KEY);
                        } else {
                            // Saved game is for an already-cleared level — discard it
                            localStorage.removeItem(WORDSORT_SAVE_KEY);
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse saved game:', e);
                    localStorage.removeItem(WORDSORT_SAVE_KEY);
                }
            }

            // Start from the next uncleared level
            let startLevelIndex = 0;
            if (clearedLevel > 0) {
                const nextIdx = levels.findIndex((l: any) => l.id === clearedLevel + 1);
                startLevelIndex = nextIdx >= 0 ? nextIdx : levels.length - 1;
            }
            const levelData = levels[startLevelIndex] || levels[0];
            dispatch({ type: 'START_LEVEL', levelData });
            triggerDealing(levelStackTotal(levelData));
        };

        doInit();
    }, []);

    const initializeNewGame = async () => {
        const tutorialDone = localStorage.getItem('wordSort_tutorialDone');
        if (!tutorialDone) {
            dispatch({ type: 'START_LEVEL', levelData: tutorialLevel });
            setTutorialStep(1);
            triggerDealing(levelStackTotal(tutorialLevel));
            return;
        }

        // Wait for Firebase auth to be ready, then load cleared level
        let startLevelIndex = 0;
        try {
            const { auth } = await import('../../../firebase');
            // Wait for auth state to be resolved (currentUser might be null on cold start)
            const user = await new Promise<any>((resolve) => {
                const unsubscribe = auth.onAuthStateChanged((u) => {
                    unsubscribe();
                    resolve(u);
                });
            });
            if (user) {
                const { getWordSortProgress } = await import('../../../services/rankingService');
                const clearedLevel = await getWordSortProgress(user.uid);
                if (clearedLevel > 0) {
                    // Find the next level after the cleared one
                    const nextIdx = levels.findIndex((l: any) => l.id === clearedLevel + 1);
                    startLevelIndex = nextIdx >= 0 ? nextIdx : levels.length - 1;
                }
            }
        } catch (e) {
            console.error('Failed to load wordSort progress:', e);
        }

        const levelData = levels[startLevelIndex] || levels[0];
        dispatch({ type: 'START_LEVEL', levelData });
        triggerDealing(levelStackTotal(levelData));
    };

    const handleResumeConfirm = (confirmed: boolean) => {
        if (confirmed && pendingSavedState) {
            dispatch({ type: 'RESTORE_GAME', savedState: pendingSavedState });
        } else {
            localStorage.removeItem(WORDSORT_SAVE_KEY);
            initializeNewGame();
        }
        setShowResumeConfirm(false);
        setPendingSavedState(null);
    };

    const resetUnlocks = () => {
        // No local state to reset anymore, START_LEVEL in reducer handles this
    };

    const handleUnlockConfirm = async () => {
        if (!unlockConfirm) return;
        const success = await spendCoins(50);
        if (!success) { setUnlockConfirm(null); return; }
        if (unlockConfirm === 'stack') {
            dispatch({ type: 'UNLOCK_STACK' });
        } else {
            dispatch({ type: 'UNLOCK_SLOT' });
        }
        setUnlockConfirm(null);
    };

    // Game over overlay: wait for slot/gather animations to finish before showing
    useEffect(() => {
        if (state.isGameOver && completingSlot === null && !gatheringCat) {
            gameOverTimerRef.current = setTimeout(() => {
                setShowGameOverOverlay(true);
            }, 300);
        } else {
            if (gameOverTimerRef.current) {
                clearTimeout(gameOverTimerRef.current);
                gameOverTimerRef.current = null;
            }
            setShowGameOverOverlay(false);
        }
    }, [state.isGameOver, completingSlot, gatheringCat]);

    const drawDeck = () => {
        if (isRemoveMode) return;
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



    // Dealing: cumulative start index per stack (for global card ordering)
    const stackStartIndices = state.stacks.map((_, idx) =>
        state.stacks.slice(0, idx).reduce((sum, s) => sum + s.length, 0)
    );

    return (
        <WordSortUIProvider value={{
            finalCardWidth,
            cardHeight,
            visibleHeight,
            cardTextSize,
            cardBadgeSize,
            cardNameSize,
            cardWordSize,
            stackCardStyle,
            slotCardStyle,
            faceDownPattern,
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
            tutorialStep,
            setTutorialStep,
            tutorialHighlightCards,
            tutorialHighlightSlots,
            tutorialHighlightDeck,
            completeTutorial,
            gatheringCat,
            gatherPhase,
            gatherOffsets,
            handleRemoveClick,
            isRemovingAction,
            removeTargetLocation,
            isRemoveMode,
            setIsRemoveMode,
            completingSlot,
            showGameOverOverlay,
            coins,
            spendCoins,
            addCoins,
            stackRefs,
            slotRefs,
            deckCardRef,
            drawDeck,
            splitText,
            setUnlockConfirm,
            setShowMoveConfirm,
            isDealingAnimation,
            dealingProgress,
            lastDrawnId,
            stackStartIndices,
            triggerDealing,
        }}>
        <div
            ref={gameContainerRef}
            className="word-solitaire-game"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e)}
            style={{
                padding: '0.5rem 1rem 1rem',
                color: 'white',
                background: 'radial-gradient(circle at center, #7a7da1 0%, #2c2e49 100%)',
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

            <DeckArea />

            <SlotArea />

            <StackArea />

            {/* Bottom Menu - 튜토리얼 중에는 숨김 */}
            <GameBottomMenu
                triggerDealing={triggerDealing}
                levelStackTotal={levelStackTotal}
                resetUnlocks={resetUnlocks}
            />

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
                            🪙 50 코인을 사용하여<br />
                            {unlockConfirm === 'stack' ? '스택' : '슬롯'} 공간을 여시겠습니까?
                        </div>
                        {coins < 50 && (
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
                                disabled={coins < 50}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: coins >= 50 ? 'linear-gradient(135deg, #f6d365, #fda085)' : 'rgba(255,255,255,0.15)', color: 'white', fontWeight: '700', cursor: coins >= 50 ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Purchase Confirm Dialog */}
            {showMoveConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{
                        background: '#3a3c5a', borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', width: '240px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>➕</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>횟수 추가</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            🪙 50 코인을 사용하여<br />
                            이동 횟수 20회를 추가하시겠습니까?
                        </div>
                        {coins < 50 && (
                            <div style={{ fontSize: '0.78rem', color: '#ff6b6b', marginBottom: '0.6rem' }}>
                                코인 부족 (현재 {coins}개)
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowMoveConfirm(false)}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                            >취소</button>
                            <button
                                onClick={async () => {
                                    const success = await spendCoins(50);
                                    if (success) {
                                        dispatch({ type: 'ADD_STEPS', count: 20 });
                                    }
                                    setShowMoveConfirm(false);
                                }}
                                disabled={coins < 50}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: coins >= 50 ? 'linear-gradient(135deg, #f6d365, #fda085)' : 'rgba(255,255,255,0.15)', color: 'white', fontWeight: '700', cursor: coins >= 50 ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}

            <GameOverlays
                showResumeConfirm={showResumeConfirm}
                pendingSavedState={pendingSavedState}
                handleResumeConfirm={handleResumeConfirm}
                triggerDealing={triggerDealing}
                levelStackTotal={levelStackTotal}
                resetUnlocks={resetUnlocks}
            />

            {/* Shop Modal */}
            {isShopOpen && <CardBackShopModal onClose={() => setIsShopOpen(false)} />}

            {/* Global Gathering Animation Overlay */}
            <GlobalOverlay
                gatheringCat={gatheringCat}
                gatherOffsets={gatherOffsets}
                gatherPhase={gatherPhase}
                categories={state.categories}
                finalCardWidth={finalCardWidth}
                cardHeight={cardHeight}
            />

            {/* 드래그 플로팅 고스트 */}
            <DragGhost />

            {/* Landing animation proxy */}
            <LandingAnimation />
        </div>
        </WordSortUIProvider>
    );
};

export default WordSortGame;

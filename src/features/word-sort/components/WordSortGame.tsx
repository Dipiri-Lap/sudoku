import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logEvent } from '../../../firebase';
import { ChevronLeft, ShoppingCart, Settings } from 'lucide-react';
import { useWordSort, WORDSORT_SAVE_KEY } from '../context/WordSortContext';
import levels from '../data/levels.json';
import tutorialLevel from '../data/tutorial-level.json';
import { useCoins } from '../../../context/CoinContext';
import { useWordSortProgress } from '../../../context/WordSortProgressContext';
import { useCardBacks, cardBackDesigns } from '../context/CardBackContext';
import CardBackShopModal from './CardBackShopModal';
import WordSortSettingsModal from './WordSortSettingsModal';
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



const WordSortGame: React.FC = () => {

    const { state, dispatch } = useWordSort();
    const location = useLocation();
    const navigate = useNavigate();
    const { addCoins, spendCoins, coins } = useCoins();
    const { saveWordSortProgress } = useWordSortProgress();
    const hasAwardedCoins = useRef(false);
    const hasSavedLevelProgress = useRef(false);
    const hasLoggedPlay = useRef(false);

    const { lockedStacks, lockedSlots } = state;
    const [unlockConfirm, setUnlockConfirm] = useState<'stack' | 'slot' | null>(null);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isRemoveMode, setIsRemoveMode] = useState(false);
    const [showMoveConfirm, setShowMoveConfirm] = useState(false);
    const [showUndoConfirm, setShowUndoConfirm] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    const [showResumeConfirm, setShowResumeConfirm] = useState(false);
    const [pendingSavedState, setPendingSavedState] = useState<any>(null);

    // Ad Reward State
    const [adWatching, setAdWatching] = useState(false);
    const [pendingShowAd, setPendingShowAd] = useState<(() => void) | null>(null);
    const [adOfferConfig, setAdOfferConfig] = useState<{
        type: 'move' | 'unlock_stack' | 'unlock_slot' | 'undo' | 'remove';
        cost: number;
        action: () => Promise<void> | void;
    } | null>(null);
    const [adUsedThisGame, setAdUsedThisGame] = useState(false);
    const [showCoinInsufficient, setShowCoinInsufficient] = useState(false);

    const [adUnlockedRemove, setAdUnlockedRemove] = useState(false);

    const handleWatchAd = (onSuccess: () => Promise<void> | void) => {
        if (adWatching) return;

        const proceed = async () => {
            setAdUsedThisGame(true);
            setAdOfferConfig(null);
            await onSuccess();
        };

        if (import.meta.env.DEV || !window.adBreak) {
            setAdWatching(true);
            setTimeout(async () => {
                await proceed();
                setAdWatching(false);
            }, 1000);
            return;
        }

        window.adBreak({
            type: 'reward',
            name: 'coin-reward',
            beforeReward: (showAdFn: () => void) => { setPendingShowAd(() => showAdFn); },
            beforeAd: () => { setAdWatching(true); setPendingShowAd(null); },
            afterAd: () => { setAdWatching(false); },
            adViewed: proceed,
            adDismissed: () => { alert('광고를 끝까지 시청해야 기능을 사용할 수 있어요.'); },
            adBreakDone: (info: { status: string }) => {
                setAdWatching(false);
                setPendingShowAd(null);
                if (info.status === 'noAdPreloaded') alert('현재 준비된 광고가 없습니다. 잠시 후 시도해주세요.');
            },
        });
    };

    const [bgmVolume, setBgmVolume] = useState(() => parseFloat(localStorage.getItem('wordSort_bgmVolume') || '0.1'));
    const [sfxVolume, setSfxVolume] = useState(() => parseFloat(localStorage.getItem('wordSort_sfxVolume') || '0.5'));
    const [textSizeMultiplier, setTextSizeMultiplier] = useState(() => parseFloat(localStorage.getItem('wordSort_textSize') || '1'));

    useEffect(() => { localStorage.setItem('wordSort_bgmVolume', bgmVolume.toString()); }, [bgmVolume]);
    useEffect(() => { localStorage.setItem('wordSort_sfxVolume', sfxVolume.toString()); }, [sfxVolume]);
    useEffect(() => { localStorage.setItem('wordSort_textSize', textSizeMultiplier.toString()); }, [textSizeMultiplier]);

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
    const gap = 5;
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
    const cardTextSize = Math.max(0.5, Math.min(0.92, finalCardWidth * 0.007 + 0.38)) * textSizeMultiplier;
    const cardBadgeSize = `${(cardTextSize * 0.70).toFixed(2)}rem`;
    const cardNameSize  = `${(cardTextSize * 0.83).toFixed(2)}rem`;
    const cardWordSize  = `${(cardTextSize * (activeSlotCount >= 5 ? 0.95 : 1.15)).toFixed(2)}rem`;
    const visibleHeight = 20; // Height of the visible strip for overlapped cards

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
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        bgmRef.current = new Audio('/assets/word-sort/sounds/wordbgm.mp3');
        bgmRef.current.loop = true;
        bgmRef.current.volume = bgmVolume;
        
        return () => { 
            if (dealingTimerRef.current) clearInterval(dealingTimerRef.current); 
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current.src = '';
            }
        };
    }, []);

    useEffect(() => {
        if (bgmRef.current) {
            bgmRef.current.volume = bgmVolume;
        }
    }, [bgmVolume]);

    // Prevent body scroll while game is active
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
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

    const getWordFontSize = (word: string, baseSizeRem: number): string => {
        const effectiveLen = word.length >= 5 ? Math.ceil(word.length / 2) : word.length;
        const available = finalCardWidth - 10;
        const estimated = effectiveLen * baseSizeRem * 16 * 0.65;
        const scale = estimated > available ? available / estimated : 1;
        return `${(baseSizeRem * scale).toFixed(2)}rem`;
    };

    const triggerDealing = (totalCards: number) => {
        if (dealingTimerRef.current) clearInterval(dealingTimerRef.current);
        setIsDealingAnimation(true);
        setDealingProgress(0);
        let count = 0;
        dealingTimerRef.current = setInterval(() => {
            count++;
            const sfx = new Audio('/assets/word-sort/sounds/cardsfx1.wav');
            sfx.volume = sfxVolume;
            sfx.play().catch(() => {});
            setDealingProgress(count);
            if (count >= totalCards) {
                clearInterval(dealingTimerRef.current!);
                dealingTimerRef.current = null;
                setTimeout(() => {
                    setIsDealingAnimation(false);
                    if (bgmRef.current && bgmRef.current.paused) {
                        bgmRef.current.play().catch(e => console.warn('BGM play prevented:', e));
                    }
                }, 350);
            }
        }, 80);
    };

    // Hook: tutorial step management
    const { tutorialStep, setTutorialStep, completeTutorial, tutorialHighlightCards, tutorialHighlightSlots, tutorialHighlightDeck } = useTutorialStep({ state, dispatch, triggerDealing });

    // Hook: gather/remove animation
    const { gatheringCat, setGatheringCat, gatherPhase, setGatherPhase, gatherOffsets, handleRemoveClick, isRemovingAction, removeTargetLocation } = useGatherAnimation({ state, dispatch, slotRefs, stackRefs, setCompletingSlot, addCoins, isRemoveMode, setIsRemoveMode, spendCoins, finalCardWidth, cardHeight, deckCardRef, adUnlockedRemove, setAdUnlockedRemove });

    // Hook: drag and drop
    const { draggingGroup, setDraggingGroup, dragGhostPos, setDragGhostPos, landingGroup, setLandingGroup, nearestValidTarget, setNearestValidTarget, nearestTarget, setNearestTarget, invalidDropTarget, handleDragStart, handleDragMove, handleDrop, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel } = useWordSortDrag({ state, dispatch, tutorialStep, gatheringCat, stackRefs, slotRefs, finalCardWidth, cardHeight, visibleHeight, sfxVolume });

    // Log game_play event once when a real (non-tutorial) level starts
    useEffect(() => {
        if (tutorialStep !== null || !state.level || hasLoggedPlay.current) return;
        hasLoggedPlay.current = true;
        logEvent('game_play', { game: 'word_sort', level: state.level });
    }, [state.level, tutorialStep]);

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
                        if (!hasSavedLevelProgress.current) {
                            hasSavedLevelProgress.current = true;
                            saveWordSortProgress(state.level).catch(console.error);
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

            // Fast path: state was pre-loaded by ModeSelect dispatch (like Sudoku)
            if (state.stacks.length > 0 && urlLevel !== null && state.level === urlLevel) {
                const levelData = levels.find((l: any) => l.id === state.level);
                if (levelData) triggerDealing(levelStackTotal(levelData));
                return;
            }

            if (!tutorialDone && urlLevel === null) {
                dispatch({ type: 'START_LEVEL', levelData: tutorialLevel });
                setTutorialStep(1);
                triggerDealing(levelStackTotal(tutorialLevel));
                return;
            }

            // Wait for Firebase auth state to be resolved (used for both URL and non-URL paths)
            let clearedLevel = parseInt(localStorage.getItem('word_sort_progress') ?? '0', 10) || 0;
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
                    const firebaseLevel = await getWordSortProgress(user.uid);
                    clearedLevel = Math.max(clearedLevel, firebaseLevel);
                }
            } catch (e) {
                console.error('Failed to load wordSort progress:', e);
            }

            if (urlLevel !== null && !isNaN(urlLevel)) {
                const maxAllowed = clearedLevel + 1;
                if (urlLevel > maxAllowed) {
                    alert(`아직 도달하지 못한 레벨입니다! (현재 도전 중: Level ${maxAllowed})`);
                    window.location.replace(`/word-sort/play?level=${maxAllowed}`);
                    return;
                }
                const levelData = levels.find((l: any) => l.id === urlLevel) || levels[0];
                dispatch({ type: 'START_LEVEL', levelData });
                triggerDealing(levelStackTotal(levelData));
                return;
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
        setAdUsedThisGame(false);
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
        const sfx = new Audio('/assets/word-sort/sounds/cardsfx2.wav');
        sfx.volume = sfxVolume;
        sfx.play().catch(() => {});
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
            bgmVolume,
            setBgmVolume,
            sfxVolume,
            setSfxVolume,
            textSizeMultiplier,
            setTextSizeMultiplier,
            draggingGroup,
            setDraggingGroup,
            dragGhostPos,
            setDragGhostPos,
            landingGroup,
            setLandingGroup,
            nearestValidTarget,
            setNearestValidTarget,
            nearestTarget,
            setNearestTarget,
            invalidDropTarget,
            handleDragStart,
            handleDragMove,
            handleDrop,
            handleTouchStart,
            handleTouchMove,
            handleTouchEnd,
            handleTouchCancel,
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
            getWordFontSize,
            setUnlockConfirm,
            setShowMoveConfirm,
            setShowUndoConfirm,
            setShowRemoveConfirm,
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
                marginLeft: '-1rem',
                marginRight: '-1rem',
                marginTop: '-1rem',
                width: 'calc(100% + 2rem)',
                color: 'white',
                background: 'radial-gradient(circle at center, #7a7da1 0%, #2c2e49 100%)',
                minHeight: '100dvh',
                fontFamily: "'Inter', sans-serif",
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'none',
                overflow: 'hidden',
                paddingBottom: tutorialStep !== null ? '200px' : undefined,
            }}>

            {/* Nav bar */}
            <div className="game-nav" style={{ marginBottom: '0.25rem', marginLeft: '-1rem', marginRight: '-1rem', marginTop: '-0.5rem', borderRadius: '0' }}>
                <div className="game-nav-left">
                    <button className="nav-icon-btn" onClick={() => navigate('/word-sort')}>
                        <ChevronLeft size={22} />
                    </button>
                    {tutorialStep === null && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', opacity: 0.7, color: 'white' }}>
                            LEVEL {state.level}
                        </span>
                    )}
                </div>
                {tutorialStep === null && (
                    <div className="game-nav-right" style={{ display: 'flex', gap: '8px' }}>
                        <button className="nav-icon-btn" onClick={() => setIsShopOpen(true)}>
                            <ShoppingCart size={20} />
                        </button>
                        <button className="nav-icon-btn" onClick={() => setIsSettingsOpen(true)}>
                            <Settings size={20} />
                        </button>
                    </div>
                )}
            </div>

            <DeckArea />

            <SlotArea />

            <div style={{ minHeight: cardHeight + 7 * visibleHeight }}>
                <StackArea />
            </div>

            {/* Bottom Menu - 튜토리얼 중에는 숨김 */}
            <GameBottomMenu
                triggerDealing={triggerDealing}
                levelStackTotal={levelStackTotal}
                resetUnlocks={resetUnlocks}
            />

            {/* Unlock Confirm Dialog */}
            {unlockConfirm && !adOfferConfig && (
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
                                onClick={async () => {
                                    if (coins < 50) {
                                        if (adUsedThisGame) { setShowCoinInsufficient(true); }
                                        else { setAdOfferConfig({ type: unlockConfirm === 'stack' ? 'unlock_stack' : 'unlock_slot', cost: 50, action: async () => { if (unlockConfirm === 'stack') dispatch({ type: 'UNLOCK_STACK' }); else dispatch({ type: 'UNLOCK_SLOT' }); setUnlockConfirm(null); } }); }
                                        return;
                                    }
                                    handleUnlockConfirm();
                                }}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #f6d365, #fda085)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Purchase Confirm Dialog */}
            {showMoveConfirm && !adOfferConfig && (
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
                                    const action = async () => {
                                        const success = await spendCoins(50);
                                        if (success) { dispatch({ type: 'ADD_STEPS', count: 20 }); }
                                        setShowMoveConfirm(false);
                                    };
                                    if (coins < 50) {
                                        if (adUsedThisGame) { setShowCoinInsufficient(true); }
                                        else { setAdOfferConfig({ type: 'move', cost: 50, action: async () => { dispatch({ type: 'ADD_STEPS', count: 20 }); setShowMoveConfirm(false); } }); }
                                        return;
                                    }
                                    action();
                                }}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #f6d365, #fda085)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Undo Confirm Dialog */}
            {showUndoConfirm && !adOfferConfig && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{
                        background: '#3a3c5a', borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', width: '240px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>↩️</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>철회</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            🪙 10 코인을 사용하여<br />
                            이전 행동을 철회하시겠습니까?
                        </div>
                        {coins < 10 && (
                            <div style={{ fontSize: '0.78rem', color: '#ff6b6b', marginBottom: '0.6rem' }}>
                                코인 부족 (현재 {coins}개)
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowUndoConfirm(false)}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                            >취소</button>
                            <button
                                onClick={async () => {
                                    const action = async () => {
                                        const success = await spendCoins(10);
                                        if (success) { dispatch({ type: 'UNDO_ACTION' }); }
                                        setShowUndoConfirm(false);
                                    };
                                    if (coins < 10) {
                                        if (adUsedThisGame) { setShowCoinInsufficient(true); }
                                        else { setAdOfferConfig({ type: 'undo', cost: 10, action: async () => { dispatch({ type: 'UNDO_ACTION' }); setShowUndoConfirm(false); } }); }
                                        return;
                                    }
                                    action();
                                }}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #f6d365, #fda085)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Confirm Dialog */}
            {showRemoveConfirm && !adOfferConfig && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{
                        background: '#3a3c5a', borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', width: '240px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🗑️</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>제거 모드</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            🪙 50 코인을 사용하여<br />
                            카테고리 제거 모드에 진입하시겠습니까?<br />
                            (진입 후 카드 클릭 시 제거됩니다.)
                        </div>
                        {coins < 50 && (
                            <div style={{ fontSize: '0.78rem', color: '#ff6b6b', marginBottom: '0.6rem' }}>
                                코인 부족 (현재 {coins}개)
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowRemoveConfirm(false)}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                            >취소</button>
                            <button
                                onClick={async () => {
                                    const action = async () => {
                                        setIsRemoveMode(true);
                                        setShowRemoveConfirm(false);
                                    };
                                    if (coins < 50) {
                                        if (adUsedThisGame) { setShowCoinInsufficient(true); }
                                        else { setAdOfferConfig({ type: 'remove', cost: 50, action: async () => { setAdUnlockedRemove(true); setIsRemoveMode(true); setShowRemoveConfirm(false); } }); }
                                        return;
                                    }
                                    action();
                                }}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #f6d365, #fda085)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ad Offer Overlay */}
            {adOfferConfig && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2050
                }}>
                    <div style={{
                        background: '#3a3c5a', borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', width: '250px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>📺</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>코인 부족</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            코인이 부족합니다.<br />
                            광고를 시청하고 🪙 50 코인을 획득하여 바로 사용하시겠습니까?
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={() => { setAdOfferConfig(null); setUnlockConfirm(null); setShowMoveConfirm(false); setShowUndoConfirm(false); setShowRemoveConfirm(false); }}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                            >취소</button>
                            <button
                                onClick={() => pendingShowAd ? pendingShowAd() : handleWatchAd(adOfferConfig.action)}
                                disabled={adWatching}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: 'white', fontWeight: '700', cursor: adWatching ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
                            >
                                {adWatching ? '로딩...' : '광고 시청'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Coin Insufficient Overlay (ad already used this game) */}
            {showCoinInsufficient && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2050
                }}>
                    <div style={{
                        background: '#3a3c5a', borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', width: '250px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🪙</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>코인 부족</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            이번 게임에서 광고 보상은<br />이미 사용되었습니다.<br />코인 상점에서 코인을 충전해주세요.
                        </div>
                        <button
                            onClick={() => setShowCoinInsufficient(false)}
                            style={{ padding: '0.45rem 1.4rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #64748b, #475569)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                        >확인</button>
                    </div>
                </div>
            )}

            <GameOverlays
                showResumeConfirm={showResumeConfirm}
                handleResumeConfirm={handleResumeConfirm}
            />

            {/* Shop Modal */}
            {isShopOpen && <CardBackShopModal onClose={() => setIsShopOpen(false)} />}

            {/* Settings Modal */}
            {isSettingsOpen && <WordSortSettingsModal onClose={() => setIsSettingsOpen(false)} />}

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

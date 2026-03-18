import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { CHALLENGE_MAP, type Challenge } from '../data/challenges';
import { useCoins } from './CoinContext';

const LS_CLEARED_KEY = 'challenge_cleared_ids';
const LS_CLAIMED_KEY = 'challenge_claimed_ids';
const LS_PUZZLE_POWER_KEY = 'puzzle_power';

interface ChallengeContextValue {
    /** Condition met, reward not yet claimed */
    clearedIds: Set<string>;
    /** Reward already claimed */
    claimedIds: Set<string>;
    /** Total accumulated puzzle power */
    puzzlePower: number;
    /** Called by game logic when a challenge condition is met */
    clearChallenge: (id: string) => Promise<void>;
    /** Called by UI "보상받기" button — grants reward and marks claimed */
    claimReward: (id: string) => Promise<Challenge | null>;
    isChallengeCleared: (id: string) => boolean;
    isChallengeCompleted: (id: string) => boolean;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

export const useChallenges = (): ChallengeContextValue => {
    const ctx = useContext(ChallengeContext);
    if (!ctx) throw new Error('useChallenges must be used within ChallengeProvider');
    return ctx;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadSet(key: string): Set<string> {
    try {
        const raw = localStorage.getItem(key);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function saveSet(key: string, set: Set<string>) {
    localStorage.setItem(key, JSON.stringify([...set]));
}

function loadPuzzlePower(): number {
    const raw = localStorage.getItem(LS_PUZZLE_POWER_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
}

function savePuzzlePower(value: number) {
    localStorage.setItem(LS_PUZZLE_POWER_KEY, String(value));
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ChallengeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addCoins } = useCoins();

    const [clearedIds, setClearedIds] = useState<Set<string>>(() => loadSet(LS_CLEARED_KEY));
    const [claimedIds, setClaimedIds] = useState<Set<string>>(() => loadSet(LS_CLAIMED_KEY));
    const [puzzlePower, setPuzzlePower] = useState<number>(loadPuzzlePower);
    const syncedRef = useRef(false);

    // Sync with Firestore on auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;

            try {
                const ref = doc(db, 'users', user.uid, 'challenges', 'data');
                const snap = await getDoc(ref);

                const localCleared = loadSet(LS_CLEARED_KEY);
                const localClaimed = loadSet(LS_CLAIMED_KEY);
                const localPP = loadPuzzlePower();

                let mergedPP = localPP;

                if (snap.exists()) {
                    const data = snap.data();
                    const cloudCleared: string[] = data?.clearedIds ?? [];
                    const cloudClaimed: string[] = data?.claimedIds ?? [];
                    const cloudPP: number = data?.puzzlePower ?? 0;

                    const mergedCleared = new Set([...localCleared, ...cloudCleared]);
                    const mergedClaimed = new Set([...localClaimed, ...cloudClaimed]);
                    mergedPP = Math.max(localPP, cloudPP);

                    saveSet(LS_CLEARED_KEY, mergedCleared);
                    saveSet(LS_CLAIMED_KEY, mergedClaimed);
                    savePuzzlePower(mergedPP);
                    setClearedIds(mergedCleared);
                    setClaimedIds(mergedClaimed);
                    setPuzzlePower(mergedPP);

                    // Write back if local is ahead of cloud
                    if (mergedPP !== cloudPP || mergedClaimed.size !== cloudClaimed.length || mergedCleared.size !== cloudCleared.length) {
                        await setDoc(ref, {
                            clearedIds: [...mergedCleared],
                            claimedIds: [...mergedClaimed],
                            puzzlePower: mergedPP,
                        }, { merge: true });
                    }
                } else if (localClaimed.size > 0 || localCleared.size > 0 || localPP > 0) {
                    // No Firestore doc yet — upload local data
                    await setDoc(ref, {
                        clearedIds: [...localCleared],
                        claimedIds: [...localClaimed],
                        puzzlePower: localPP,
                    });
                }

                // Sync challenge PP delta to main user document (used by ranking/landing page)
                // mainDocSyncedPP tracks how much challenge PP has already been added to main doc
                const alreadySynced: number = snap.exists() ? (snap.data()?.mainDocSyncedPP ?? 0) : 0;
                const delta = mergedPP - alreadySynced;
                if (delta > 0) {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, { puzzlePower: increment(delta) });
                    await setDoc(ref, { mainDocSyncedPP: mergedPP }, { merge: true });
                }
            } catch (e) {
                console.error('ChallengeContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    const persistToFirestore = useCallback(async (
        nextCleared: Set<string>,
        nextClaimed: Set<string>,
        nextPP: number
    ) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await setDoc(
                doc(db, 'users', user.uid, 'challenges', 'data'),
                {
                    clearedIds: [...nextCleared],
                    claimedIds: [...nextClaimed],
                    puzzlePower: nextPP,
                },
                { merge: true }
            );
        } catch (e) {
            console.error('ChallengeContext save error:', e);
        }
    }, []);

    /** Called by game when a challenge condition is met */
    const clearChallenge = useCallback(async (id: string) => {
        if (!CHALLENGE_MAP[id]) return;
        if (clearedIds.has(id) || claimedIds.has(id)) return;

        const next = new Set(clearedIds).add(id);
        saveSet(LS_CLEARED_KEY, next);
        setClearedIds(next);
        await persistToFirestore(next, claimedIds, puzzlePower);
    }, [clearedIds, claimedIds, puzzlePower, persistToFirestore]);

    /** Called by UI "보상받기" button */
    const claimReward = useCallback(async (id: string): Promise<Challenge | null> => {
        const challenge = CHALLENGE_MAP[id];
        if (!challenge) return null;
        if (claimedIds.has(id)) return null;
        // Time attack challenges require explicit clearChallenge() call from game
        if (challenge.progressConfig.source === 'time_attack' && !clearedIds.has(id)) return null;

        const nextClaimed = new Set(claimedIds).add(id);
        const nextPP = puzzlePower + challenge.reward.puzzle_power;

        saveSet(LS_CLAIMED_KEY, nextClaimed);
        savePuzzlePower(nextPP);
        setClaimedIds(nextClaimed);
        setPuzzlePower(nextPP);

        await addCoins(challenge.reward.coin);
        await persistToFirestore(clearedIds, nextClaimed, nextPP);

        // Update main user profile document and track synced amount
        const user = auth.currentUser;
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    puzzlePower: increment(challenge.reward.puzzle_power),
                });
                await setDoc(
                    doc(db, 'users', user.uid, 'challenges', 'data'),
                    { mainDocSyncedPP: nextPP },
                    { merge: true }
                );
            } catch (e) {
                console.error('ChallengeContext puzzlePower update error:', e);
            }
        }

        return challenge;
    }, [clearedIds, claimedIds, puzzlePower, addCoins, persistToFirestore]);

    const isChallengeCleared = useCallback(
        (id: string) => clearedIds.has(id) && !claimedIds.has(id),
        [clearedIds, claimedIds]
    );

    const isChallengeCompleted = useCallback(
        (id: string) => claimedIds.has(id),
        [claimedIds]
    );

    return (
        <ChallengeContext.Provider value={{
            clearedIds,
            claimedIds,
            puzzlePower,
            clearChallenge,
            claimReward,
            isChallengeCleared,
            isChallengeCompleted,
        }}>
            {children}
        </ChallengeContext.Provider>
    );
};

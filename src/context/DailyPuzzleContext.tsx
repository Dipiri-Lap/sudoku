import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db, logEvent } from '../firebase';
import { useCoins } from './CoinContext';
import { useChallenges } from './ChallengeContext';
import { DAILY_CHALLENGES, type Challenge } from '../data/challenges';
import { unlockAvatar } from '../services/rankingService';

const LS_CLEARED_KEY = 'daily_cleared_dates';
const LS_UNLOCKED_KEY = 'daily_unlocked_dates';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'dailyPuzzle', 'data');

/** 오늘의 퍼즐 클리어 보상 */
export const DAILY_REWARD_COIN = 100;
export const DAILY_REWARD_PUZZLE_POWER = 10;

/** 지난 날짜 문제 해제 비용. 이 달(포함) 이후의 문제만 해제할 수 있다. */
export const DAILY_UNLOCK_COST = 300;
export const DAILY_UNLOCK_FROM_MONTH = '2026-10';

/**
 * 오늘보다 앞선 날짜 중 해제 대상이 되는 날인지 (이미 풀었거나 해제했는지는 보지 않는다).
 * 이번 달에 지나간 날만 해제할 수 있고, 달이 바뀌면 지난달의 남은 문제는 더 이상 열 수 없다.
 */
export const isUnlockableDate = (date: string, today: string): boolean =>
    date < today
    && date.slice(0, 7) === today.slice(0, 7)
    && date.slice(0, 7) >= DAILY_UNLOCK_FROM_MONTH;

interface DailyPuzzleContextValue {
    /** 클리어한 날짜(YYYY-MM-DD) 집합 */
    clearedDates: Set<string>;
    isCleared: (date: string) => boolean;
    /** 코인으로 해제한 지난 날짜 집합 */
    unlockedDates: Set<string>;
    /** 300코인을 내고 지난 날짜를 해제한다. 코인이 모자라거나 해제할 수 없는 날이면 false. */
    unlockDaily: (date: string, today: string) => Promise<boolean>;
    /** 클리어 처리 + 보상 지급. 이미 받은 날짜면 아무 일도 하지 않고 false 를 반환한다. */
    clearDaily: (date: string) => Promise<boolean>;
    /** 방금 클리어로 한 달을 완성해 자동 지급된 월간 보상. 결과 화면에서 보여 주고 지운다. */
    monthReward: Challenge | null;
    clearMonthReward: () => void;
}

const DailyPuzzleContext = createContext<DailyPuzzleContextValue | null>(null);

export const useDailyPuzzle = (): DailyPuzzleContextValue => {
    const ctx = useContext(DailyPuzzleContext);
    if (!ctx) throw new Error('useDailyPuzzle must be used within DailyPuzzleProvider');
    return ctx;
};

function loadSet(key: string = LS_CLEARED_KEY): Set<string> {
    try {
        const raw = localStorage.getItem(key);
        return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function saveSet(set: Set<string>, key: string = LS_CLEARED_KEY) {
    localStorage.setItem(key, JSON.stringify([...set]));
}

export const DailyPuzzleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addCoins, spendCoins } = useCoins();
    const { claimReward } = useChallenges();
    const [monthReward, setMonthReward] = useState<Challenge | null>(null);
    const [clearedDates, setClearedDates] = useState<Set<string>>(loadSet);
    const [unlockedDates, setUnlockedDates] = useState<Set<string>>(() => loadSet(LS_UNLOCKED_KEY));
    const syncedRef = useRef(false);

    // 로그인 시 클라우드와 병합 (기기 간 도장판 유지)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;

            try {
                const ref = FIRESTORE_DOC(user.uid);
                const snap = await getDoc(ref);
                const local = loadSet();
                const cloud: string[] = snap.exists() ? (snap.data()?.clearedDates ?? []) : [];

                const merged = new Set([...local, ...cloud]);
                if (merged.size !== local.size) {
                    saveSet(merged);
                    setClearedDates(merged);
                }

                const localUnlocked = loadSet(LS_UNLOCKED_KEY);
                const cloudUnlocked: string[] = snap.exists() ? (snap.data()?.unlockedDates ?? []) : [];
                const mergedUnlocked = new Set([...localUnlocked, ...cloudUnlocked]);
                if (mergedUnlocked.size !== localUnlocked.size) {
                    saveSet(mergedUnlocked, LS_UNLOCKED_KEY);
                    setUnlockedDates(mergedUnlocked);
                }

                if (merged.size !== cloud.length || mergedUnlocked.size !== cloudUnlocked.length) {
                    await setDoc(ref, { clearedDates: [...merged], unlockedDates: [...mergedUnlocked] }, { merge: true });
                }
            } catch (e) {
                console.error('DailyPuzzleContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    const isCleared = useCallback((date: string) => clearedDates.has(date), [clearedDates]);

    const unlockDaily = useCallback(async (date: string, today: string): Promise<boolean> => {
        if (!isUnlockableDate(date, today)) return false;
        const storedUnlocked = loadSet(LS_UNLOCKED_KEY);
        if (storedUnlocked.has(date) || loadSet().has(date)) return false;

        // 코인부터 차감하고, 성공했을 때만 해제를 기록한다.
        const paid = await spendCoins(DAILY_UNLOCK_COST);
        if (!paid) return false;

        const next = new Set(storedUnlocked).add(date);
        saveSet(next, LS_UNLOCKED_KEY);
        setUnlockedDates(next);
        logEvent('daily_unlock', { date, cost: DAILY_UNLOCK_COST });

        const user = auth.currentUser;
        if (user) {
            try {
                await setDoc(FIRESTORE_DOC(user.uid), { unlockedDates: [...next] }, { merge: true });
            } catch (e) {
                console.error('DailyPuzzleContext unlock save error:', e);
            }
        }
        return true;
    }, [spendCoins]);

    const clearDaily = useCallback(async (date: string): Promise<boolean> => {
        // 중복 지급 방지: 화면 상태가 아니라 저장소를 직접 본다.
        // (승리 이펙트가 두 번 도는 등으로 같은 틱에 두 번 불릴 수 있다)
        const stored = loadSet();
        if (stored.has(date)) return false;

        const next = new Set(stored).add(date);
        saveSet(next);
        setClearedDates(next);

        await addCoins(DAILY_REWARD_COIN);
        // 습관이 붙었는지 보는 지표. 누적 완료 수를 같이 보내 코호트를 나눈다.
        logEvent('daily_clear', { date, total_cleared: next.size });

        const user = auth.currentUser;
        if (user) {
            try {
                await setDoc(FIRESTORE_DOC(user.uid), { clearedDates: [...next] }, { merge: true });
                // 퍼즐력은 랭킹/프로필이 읽는 최상위 사용자 문서에 누적된다.
                await updateDoc(doc(db, 'users', user.uid), {
                    puzzlePower: increment(DAILY_REWARD_PUZZLE_POWER),
                });
            } catch (e) {
                console.error('DailyPuzzleContext save error:', e);
            }
        }

        // 한 달을 모두 채웠다면 도전과제 창을 거치지 않고 바로 보상을 지급한다.
        const monthChallenge = DAILY_CHALLENGES.find(c => c.progressConfig.month === date.slice(0, 7));
        if (monthChallenge) {
            const monthCount = [...next].filter(d => d.startsWith(monthChallenge.progressConfig.month ?? '')).length;
            if (monthCount >= monthChallenge.progressConfig.target) {
                const granted = await claimReward(monthChallenge.id);
                if (granted) {
                    setMonthReward(granted);
                    if (granted.reward.avatar && auth.currentUser) {
                        try {
                            await unlockAvatar(auth.currentUser.uid, granted.reward.avatar);
                        } catch (e) {
                            console.error('DailyPuzzleContext avatar grant error:', e);
                        }
                    }
                }
            }
        }
        return true;
    }, [addCoins, claimReward]);

    const clearMonthReward = useCallback(() => setMonthReward(null), []);

    return (
        <DailyPuzzleContext.Provider value={{ clearedDates, isCleared, unlockedDates, unlockDaily, clearDaily, monthReward, clearMonthReward }}>
            {children}
        </DailyPuzzleContext.Provider>
    );
};

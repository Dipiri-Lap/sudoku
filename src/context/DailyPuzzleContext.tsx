import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db, logEvent } from '../firebase';
import { useCoins } from './CoinContext';

const LS_CLEARED_KEY = 'daily_cleared_dates';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'dailyPuzzle', 'data');

/** 오늘의 퍼즐 클리어 보상 */
export const DAILY_REWARD_COIN = 100;
export const DAILY_REWARD_PUZZLE_POWER = 30;

interface DailyPuzzleContextValue {
    /** 클리어한 날짜(YYYY-MM-DD) 집합 */
    clearedDates: Set<string>;
    isCleared: (date: string) => boolean;
    /** 클리어 처리 + 보상 지급. 이미 받은 날짜면 아무 일도 하지 않고 false 를 반환한다. */
    clearDaily: (date: string) => Promise<boolean>;
}

const DailyPuzzleContext = createContext<DailyPuzzleContextValue | null>(null);

export const useDailyPuzzle = (): DailyPuzzleContextValue => {
    const ctx = useContext(DailyPuzzleContext);
    if (!ctx) throw new Error('useDailyPuzzle must be used within DailyPuzzleProvider');
    return ctx;
};

function loadSet(): Set<string> {
    try {
        const raw = localStorage.getItem(LS_CLEARED_KEY);
        return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function saveSet(set: Set<string>) {
    localStorage.setItem(LS_CLEARED_KEY, JSON.stringify([...set]));
}

export const DailyPuzzleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addCoins } = useCoins();
    const [clearedDates, setClearedDates] = useState<Set<string>>(loadSet);
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
                if (merged.size !== cloud.length) {
                    await setDoc(ref, { clearedDates: [...merged] }, { merge: true });
                }
            } catch (e) {
                console.error('DailyPuzzleContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    const isCleared = useCallback((date: string) => clearedDates.has(date), [clearedDates]);

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
        return true;
    }, [addCoins]);

    return (
        <DailyPuzzleContext.Provider value={{ clearedDates, isCleared, clearDaily }}>
            {children}
        </DailyPuzzleContext.Provider>
    );
};

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';

// 레거시(단일 잔액) 키 - 마이그레이션 소스로만 사용
const LEGACY_LS_KEY = 'puzzle_coins';
const FREE_LS_KEY = 'puzzle_free_coins';
const PAID_LS_KEY = 'puzzle_paid_coins';

interface CoinContextValue {
    coins: number;
    pendingReward: number | null;
    addCoins: (amount: number) => Promise<void>;
    spendCoins: (amount: number) => Promise<boolean>;
    applyServerGrant: (amount: number) => void;
    clearPendingReward: () => void;
}

const CoinContext = createContext<CoinContextValue | null>(null);

export const useCoins = (): CoinContextValue => {
    const ctx = useContext(CoinContext);
    if (!ctx) throw new Error('useCoins must be used within CoinProvider');
    return ctx;
};

const readInt = (key: string): number => parseInt(localStorage.getItem(key) ?? '0', 10) || 0;

export const CoinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 무료 코인(광고 시청, 게임 보상 등) - 환불 대상 아님
    const [freeCoins, setFreeCoins] = useState<number>(() => {
        if (import.meta.env.DEV) return 99999;
        const stored = localStorage.getItem(FREE_LS_KEY);
        if (stored !== null) return parseInt(stored, 10) || 0;
        // 레거시 단일 잔액을 무료 코인으로 마이그레이션 (유료로 잘못 간주하지 않도록 보수적으로 처리)
        return readInt(LEGACY_LS_KEY);
    });
    // 유료 코인(실결제로 지급) - 환불 심사 시 이 값만 확인
    const [paidCoins, setPaidCoins] = useState<number>(() => {
        if (import.meta.env.DEV) return 0;
        return readInt(PAID_LS_KEY);
    });
    const coins = freeCoins + paidCoins;

    const [pendingReward, setPendingReward] = useState<number | null>(null);
    const syncedRef = useRef(false);

    // Sync with Firestore on auth state change
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;

            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);
                const cloudData = snap.data();

                let cloudFree: number;
                let cloudPaid: number;
                if (cloudData?.freeCoins === undefined && cloudData?.paidCoins === undefined) {
                    // 레거시 단일 'coins' 필드만 있는 계정 - 전액 무료 코인으로 간주
                    cloudFree = cloudData?.coins ?? 0;
                    cloudPaid = 0;
                } else {
                    cloudFree = cloudData?.freeCoins ?? 0;
                    cloudPaid = cloudData?.paidCoins ?? 0;
                }

                const localFree = readInt(FREE_LS_KEY);
                const localPaid = readInt(PAID_LS_KEY);
                const mergedFree = Math.max(localFree, cloudFree);
                const mergedPaid = Math.max(localPaid, cloudPaid);

                if (mergedFree !== localFree || mergedPaid !== localPaid) {
                    localStorage.setItem(FREE_LS_KEY, String(mergedFree));
                    localStorage.setItem(PAID_LS_KEY, String(mergedPaid));
                    setFreeCoins(mergedFree);
                    setPaidCoins(mergedPaid);
                }
            } catch (e) {
                console.error('CoinContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    // 무료 코인 지급 (광고 시청, 게임 보상, 챌린지 보상 등)
    const addCoins = useCallback(async (amount: number) => {
        const next = freeCoins + amount;
        localStorage.setItem(FREE_LS_KEY, String(next));
        setFreeCoins(next);
        setPendingReward(amount);

        const user = auth.currentUser;
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), { freeCoins: increment(amount) });
            } catch {
                // Firestore 문서가 없으면 생성
                await setDoc(doc(db, 'users', user.uid), { freeCoins: next }, { merge: true });
            }
        }
    }, [freeCoins]);

    // 코인 사용 - 무료 코인부터 차감하고, 모자라면 유료 코인에서 차감
    const spendCoins = useCallback(async (amount: number): Promise<boolean> => {
        if (freeCoins + paidCoins < amount) return false;

        const fromFree = Math.min(freeCoins, amount);
        const fromPaid = amount - fromFree;
        const nextFree = freeCoins - fromFree;
        const nextPaid = paidCoins - fromPaid;

        localStorage.setItem(FREE_LS_KEY, String(nextFree));
        localStorage.setItem(PAID_LS_KEY, String(nextPaid));
        setFreeCoins(nextFree);
        setPaidCoins(nextPaid);

        const user = auth.currentUser;
        if (user) {
            const updates: Record<string, ReturnType<typeof increment>> = {};
            if (fromFree > 0) updates.freeCoins = increment(-fromFree);
            if (fromPaid > 0) updates.paidCoins = increment(-fromPaid);
            try {
                await updateDoc(doc(db, 'users', user.uid), updates);
            } catch {
                await setDoc(doc(db, 'users', user.uid), { freeCoins: nextFree, paidCoins: nextPaid }, { merge: true });
            }
        }
        return true;
    }, [freeCoins, paidCoins]);

    // 서버(Cloud Functions)에서 이미 Firestore의 paidCoins에 지급한 경우,
    // 클라이언트 로컬 상태만 맞춰준다 (Firestore 재기록 X - 중복 지급 방지)
    const applyServerGrant = useCallback((amount: number) => {
        setPaidCoins(prev => {
            const next = prev + amount;
            localStorage.setItem(PAID_LS_KEY, String(next));
            return next;
        });
        setPendingReward(amount);
    }, []);

    const clearPendingReward = useCallback(() => setPendingReward(null), []);

    return (
        <CoinContext.Provider value={{ coins, pendingReward, addCoins, spendCoins, applyServerGrant, clearPendingReward }}>
            {children}
        </CoinContext.Provider>
    );
};

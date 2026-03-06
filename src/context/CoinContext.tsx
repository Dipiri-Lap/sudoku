import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import CoinRewardToast from '../common/components/CoinRewardToast';

const LS_KEY = 'puzzle_coins';

interface CoinContextValue {
    coins: number;
    pendingReward: number | null;
    addCoins: (amount: number) => Promise<void>;
    spendCoins: (amount: number) => Promise<boolean>;
    clearPendingReward: () => void;
}

const CoinContext = createContext<CoinContextValue | null>(null);

export const useCoins = (): CoinContextValue => {
    const ctx = useContext(CoinContext);
    if (!ctx) throw new Error('useCoins must be used within CoinProvider');
    return ctx;
};

export const CoinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [coins, setCoins] = useState<number>(() => {
        if (import.meta.env.DEV) return 99999;
        const stored = localStorage.getItem(LS_KEY);
        return stored ? parseInt(stored, 10) || 0 : 0;
    });
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
                const cloudCoins: number = cloudData?.coins ?? 0;
                const localCoins = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
                const merged = Math.max(localCoins, cloudCoins);

                if (merged !== localCoins) {
                    localStorage.setItem(LS_KEY, String(merged));
                    setCoins(merged);
                }
            } catch (e) {
                console.error('CoinContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    const addCoins = useCallback(async (amount: number) => {
        const next = coins + amount;
        localStorage.setItem(LS_KEY, String(next));
        setCoins(next);
        setPendingReward(amount);

        const user = auth.currentUser;
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), { coins: increment(amount) });
            } catch {
                // Firestore 문서가 없으면 생성
                await setDoc(doc(db, 'users', user.uid), { coins: next }, { merge: true });
            }
        }
    }, [coins]);

    const spendCoins = useCallback(async (amount: number): Promise<boolean> => {
        if (coins < amount) return false;
        const next = coins - amount;
        localStorage.setItem(LS_KEY, String(next));
        setCoins(next);

        const user = auth.currentUser;
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), { coins: increment(-amount) });
            } catch {
                await setDoc(doc(db, 'users', user.uid), { coins: next }, { merge: true });
            }
        }
        return true;
    }, [coins]);

    const clearPendingReward = useCallback(() => setPendingReward(null), []);

    return (
        <CoinContext.Provider value={{ coins, pendingReward, addCoins, spendCoins, clearPendingReward }}>
            {children}
            <CoinRewardToast />
        </CoinContext.Provider>
    );
};

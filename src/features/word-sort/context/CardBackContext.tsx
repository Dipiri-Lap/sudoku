import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

export interface CardBackDesign {
    id: string;
    name: string;
    description: string;
    pattern: string; // CSS value for background or backgroundImage
    isImage?: boolean;
}

const FREE_BACK_IDS = ['1','2','3','4','5','6','7','8'];

export const cardBackDesigns: CardBackDesign[] = Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    name: `디자인 ${i + 1}`,
    description: `카드 뒷면 디자인 ${i + 1}`,
    pattern: `url('/assets/word-sort/${i + 1}.png')`,
    isImage: true,
}));

const LS_UNLOCKED_KEY = 'wordSort_unlockedBacks';
const LS_SELECTED_KEY = 'wordSort_selectedBack';
const UNLOCK_COST = 200;

interface CardBackContextValue {
    unlockedBacks: string[];
    selectedBackId: string;
    hasUnlocked: (id: string) => boolean;
    unlockBack: (id: string) => Promise<boolean>;
    selectBack: (id: string) => void;
    currentDesign: CardBackDesign;
}

const CardBackContext = createContext<CardBackContextValue | null>(null);

export const useCardBacks = () => {
    const context = useContext(CardBackContext);
    if (!context) {
        throw new Error('useCardBacks must be used within a CardBackProvider');
    }
    return context;
};

export const CardBackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { spendCoins } = useCoins();
    
    const [selectedBackId, setSelectedBackId] = useState<string>(() => {
        return localStorage.getItem(LS_SELECTED_KEY) || '1';
    });
    
    const [unlockedBacks, setUnlockedBacks] = useState<string[]>(() => {
        const stored = localStorage.getItem(LS_UNLOCKED_KEY);
        try {
            const parsed = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(parsed)) return [...FREE_BACK_IDS];
            const merged = new Set([...FREE_BACK_IDS, ...parsed]);
            return Array.from(merged);
        } catch {
            return [...FREE_BACK_IDS];
        }
    });

    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;

            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);
                const cloudUnlocked: string[] = snap.exists() ? (snap.data().unlockedWordSortBacks || []) : [];

                const localUnlockedStr = localStorage.getItem(LS_UNLOCKED_KEY);
                let localUnlocked: string[] = [];
                try {
                    localUnlocked = localUnlockedStr ? JSON.parse(localUnlockedStr) : [];
                } catch (e) {}

                const mergedSet = new Set([...FREE_BACK_IDS, ...localUnlocked, ...cloudUnlocked]);
                const mergedArray = Array.from(mergedSet);

                if (mergedArray.length !== localUnlocked.length || !mergedArray.every(id => localUnlocked.includes(id))) {
                    setUnlockedBacks(mergedArray);
                    localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(mergedArray));
                }

                // 선택된 카드 동기화: 클라우드 우선, 없으면 로컬 유지
                const cloudSelected: string | null = snap.exists() ? (snap.data().selectedWordSortBack ?? null) : null;
                if (cloudSelected && mergedArray.includes(cloudSelected)) {
                    setSelectedBackId(cloudSelected);
                    localStorage.setItem(LS_SELECTED_KEY, cloudSelected);
                }

                const updatePayload: Record<string, unknown> = {};
                if (mergedArray.length !== cloudUnlocked.length || !mergedArray.every(id => cloudUnlocked.includes(id))) {
                    updatePayload.unlockedWordSortBacks = mergedArray;
                }
                if (!cloudSelected) {
                    updatePayload.selectedWordSortBack = localStorage.getItem(LS_SELECTED_KEY) || '1';
                }
                if (Object.keys(updatePayload).length > 0) {
                    await setDoc(userRef, updatePayload, { merge: true });
                }

            } catch (err) {
                console.error("Failed to sync card backs with Firebase", err);
            }
        });

        return unsubscribe;
    }, []);

    const hasUnlocked = useCallback((id: string) => {
        return unlockedBacks.includes(id);
    }, [unlockedBacks]);

    const unlockBack = async (id: string): Promise<boolean> => {
        if (hasUnlocked(id)) return true;

        const success = await spendCoins(UNLOCK_COST);
        if (!success) {
            return false;
        }

        const newUnlocked = [...unlockedBacks, id];
        setUnlockedBacks(newUnlocked);
        localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(newUnlocked));

        const user = auth.currentUser;
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { unlockedWordSortBacks: newUnlocked }, { merge: true });
            } catch (err) {
                console.error("Failed to update Firebase after purchase", err);
            }
        }
        
        selectBack(id);
        
        return true;
    };

    const selectBack = (id: string) => {
        if (!hasUnlocked(id)) return;
        setSelectedBackId(id);
        localStorage.setItem(LS_SELECTED_KEY, id);
        const user = auth.currentUser;
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            setDoc(userRef, { selectedWordSortBack: id }, { merge: true }).catch(err =>
                console.error("Failed to save selected card back", err)
            );
        }
    };

    const currentDesign = cardBackDesigns.find(d => d.id === selectedBackId) || cardBackDesigns[0];

    return (
        <CardBackContext.Provider value={{ unlockedBacks, selectedBackId, hasUnlocked, unlockBack, selectBack, currentDesign }}>
            {children}
        </CardBackContext.Provider>
    );
};

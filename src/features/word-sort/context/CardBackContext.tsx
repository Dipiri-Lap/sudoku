import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../../../firebase';

export interface CardBack {
    id: string;
    price: number;
    pattern: string; // URL or CSS value
}

export const AVAILABLE_CARD_BACKS: CardBack[] = [
    { id: 'default', price: 0, pattern: `url('/assets/word-sort/card-back.png')` },
    { id: 'wood', price: 200, pattern: `url('/assets/word-sort/card-back-wood.png')` },
    { id: 'holo', price: 200, pattern: `url('/assets/word-sort/card-back-holo.png')` },
    { id: 'royal', price: 200, pattern: `url('/assets/word-sort/card-back-royal.png')` },
    { id: 'nature', price: 200, pattern: `url('/assets/word-sort/card-back-nature.png')` },
];

interface CardBackContextValue {
    unlockedIds: string[];
    selectedId: string;
    unlockCardBack: (id: string, price: number) => Promise<boolean>;
    selectCardBack: (id: string) => Promise<void>;
}

const CardBackContext = createContext<CardBackContextValue | null>(null);

export const useCardBack = () => {
    const ctx = useContext(CardBackContext);
    if (!ctx) throw new Error('useCardBack must be used within CardBackProvider');
    return ctx;
};

export const CardBackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [unlockedIds, setUnlockedIds] = useState<string[]>(['default']);
    const [selectedId, setSelectedId] = useState<string>('default');


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setUnlockedIds(['default']);
                setSelectedId('default');
                return;

            }

            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);

                if (snap.exists()) {
                    const data = snap.data();
                    if (data.cardBacks) {
                        setUnlockedIds(data.cardBacks.unlocked || ['default']);
                        setSelectedId(data.cardBacks.selected || 'default');
                    } else {
                        // Initial setup for existing users without cardBacks data
                        await updateDoc(userRef, {
                            cardBacks: { unlocked: ['default'], selected: 'default' }
                        });
                    }
                }
            } catch (e) {
                console.error('Error fetching card backs:', e);
            }
        });

        return unsubscribe;
    }, []);

    const unlockCardBack = useCallback(async (id: string, _price: number): Promise<boolean> => {

        const user = auth.currentUser;
        if (!user || user.isAnonymous) return false;

        const newUnlocked = [...unlockedIds, id];
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'cardBacks.unlocked': newUnlocked
            });
            setUnlockedIds(newUnlocked);
            return true;
        } catch (e) {
            console.error('Unlock error:', e);
            return false;
        }
    }, [unlockedIds]);

    const selectCardBack = useCallback(async (id: string) => {
        setSelectedId(id);
        const user = auth.currentUser;
        if (!user || user.isAnonymous) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'cardBacks.selected': id
            });
        } catch (e) {
            console.error('Selection save error:', e);
        }
    }, []);

    return (
        <CardBackContext.Provider value={{ unlockedIds, selectedId, unlockCardBack, selectCardBack }}>
            {children}
        </CardBackContext.Provider>
    );
};

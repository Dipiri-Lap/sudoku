import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const LS_KEY = 'word_sort_hard_progress';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'wordSortHardProgress', 'data');

interface WordSortHardProgressContextValue {
    wordSortHardProgress: number;
    isHardSynced: boolean;
    saveWordSortHardProgress: (level: number) => Promise<void>;
}

const WordSortHardProgressContext = createContext<WordSortHardProgressContextValue | null>(null);

export const useWordSortHardProgress = (): WordSortHardProgressContextValue => {
    const ctx = useContext(WordSortHardProgressContext);
    if (!ctx) throw new Error('useWordSortHardProgress must be used within WordSortHardProgressProvider');
    return ctx;
};

export const WordSortHardProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wordSortHardProgress, setWordSortHardProgress] = useState<number>(() => {
        const stored = localStorage.getItem(LS_KEY);
        return stored ? parseInt(stored, 10) || 0 : 0;
    });
    const [isHardSynced, setIsHardSynced] = useState(false);
    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            if (syncedRef.current) return;
            syncedRef.current = true;
            try {
                const snap = await getDoc(FIRESTORE_DOC(user.uid));
                const cloudLevel = snap.exists() ? (snap.data()?.clearedLevel ?? 0) : 0;
                const localLevel = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
                const merged = Math.max(localLevel, cloudLevel);
                if (merged !== localLevel) {
                    localStorage.setItem(LS_KEY, String(merged));
                    setWordSortHardProgress(merged);
                } else {
                    setWordSortHardProgress(merged);
                }
                if (merged !== cloudLevel) {
                    await setDoc(FIRESTORE_DOC(user.uid), { clearedLevel: merged }, { merge: true });
                }
            } catch (e) {
                console.error('WordSortHardProgressContext sync error:', e);
            }
            setIsHardSynced(true);
        });
        return unsubscribe;
    }, []);

    const saveWordSortHardProgress = useCallback(async (level: number) => {
        const current = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
        if (level <= current) return;
        localStorage.setItem(LS_KEY, String(level));
        setWordSortHardProgress(level);
        const user = auth.currentUser;
        if (user) {
            await setDoc(FIRESTORE_DOC(user.uid), { clearedLevel: level }, { merge: true });
        }
    }, []);

    return (
        <WordSortHardProgressContext.Provider value={{ wordSortHardProgress, isHardSynced, saveWordSortHardProgress }}>
            {children}
        </WordSortHardProgressContext.Provider>
    );
};

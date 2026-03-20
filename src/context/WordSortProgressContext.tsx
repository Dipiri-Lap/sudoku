import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const LS_KEY = 'word_sort_progress';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'wordSortProgress', 'data');

interface WordSortProgressContextValue {
    wordSortProgress: number;
    saveWordSortProgress: (level: number) => Promise<void>;
}

const WordSortProgressContext = createContext<WordSortProgressContextValue | null>(null);

export const useWordSortProgress = (): WordSortProgressContextValue => {
    const ctx = useContext(WordSortProgressContext);
    if (!ctx) throw new Error('useWordSortProgress must be used within WordSortProgressProvider');
    return ctx;
};

export const WordSortProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wordSortProgress, setWordSortProgress] = useState<number>(() => {
        const stored = localStorage.getItem(LS_KEY);
        return stored ? parseInt(stored, 10) || 0 : 0;
    });
    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;
            try {
                const snap = await getDoc(FIRESTORE_DOC(user.uid));
                const cloudLevel = snap.exists() ? (snap.data()?.clearedLevel ?? 0) : 0;
                const localLevel = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
                const merged = Math.max(localLevel, cloudLevel);
                if (merged !== localLevel) {
                    localStorage.setItem(LS_KEY, String(merged));
                    setWordSortProgress(merged);
                } else {
                    setWordSortProgress(merged);
                }
                if (merged !== cloudLevel) {
                    await setDoc(FIRESTORE_DOC(user.uid), { clearedLevel: merged }, { merge: true });
                }
            } catch (e) {
                console.error('WordSortProgressContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    const saveWordSortProgress = useCallback(async (level: number) => {
        const current = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
        if (level <= current) return;
        localStorage.setItem(LS_KEY, String(level));
        setWordSortProgress(level);
        const user = auth.currentUser;
        if (user) {
            await setDoc(FIRESTORE_DOC(user.uid), { clearedLevel: level }, { merge: true });
        }
    }, []);

    return (
        <WordSortProgressContext.Provider value={{ wordSortProgress, saveWordSortProgress }}>
            {children}
        </WordSortProgressContext.Provider>
    );
};

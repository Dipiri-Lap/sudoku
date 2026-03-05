import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const LS_KEY = 'sudoku_stage_progress';

interface SudokuProgressContextValue {
    stageProgress: number;
    saveStageProgress: (nextLevel: number) => Promise<void>;
}

const SudokuProgressContext = createContext<SudokuProgressContextValue | null>(null);

export const useSudokuProgress = (): SudokuProgressContextValue => {
    const ctx = useContext(SudokuProgressContext);
    if (!ctx) throw new Error('useSudokuProgress must be used within SudokuProgressProvider');
    return ctx;
};

export const SudokuProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stageProgress, setStageProgress] = useState<number>(() => {
        const stored = localStorage.getItem(LS_KEY);
        return stored ? parseInt(stored, 10) || 1 : 1;
    });
    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;

            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);
                const cloudData = snap.data();
                const cloudProgress: number = cloudData?.sudokuStageProgress ?? 1;
                const localProgress = parseInt(localStorage.getItem(LS_KEY) ?? '1', 10) || 1;
                const merged = Math.max(localProgress, cloudProgress);

                if (merged !== localProgress) {
                    localStorage.setItem(LS_KEY, String(merged));
                    setStageProgress(merged);
                }
                // Always ensure field exists
                if (merged !== cloudProgress || !snap.exists() || cloudData?.sudokuStageProgress === undefined) {
                    await setDoc(userRef, { sudokuStageProgress: merged }, { merge: true });
                }
            } catch (e) {
                console.error('SudokuProgressContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    const saveStageProgress = useCallback(async (nextLevel: number) => {
        localStorage.setItem(LS_KEY, String(nextLevel));
        setStageProgress(nextLevel);

        const user = auth.currentUser;
        if (user) {
            await setDoc(doc(db, 'users', user.uid), { sudokuStageProgress: nextLevel }, { merge: true });
        }
    }, []);

    return (
        <SudokuProgressContext.Provider value={{ stageProgress, saveStageProgress }}>
            {children}
        </SudokuProgressContext.Provider>
    );
};

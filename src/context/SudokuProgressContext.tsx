import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const LS_STAGE_KEY = 'sudoku_stage_progress';
const LS_BEGINNER_KEY = 'beginner_progress';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'sudokuProgress', 'data');

interface SudokuProgressContextValue {
    stageProgress: number;
    saveStageProgress: (nextLevel: number) => Promise<void>;
    beginnerProgress: number;
    saveBeginnerProgress: (level: number) => Promise<void>;
}

const SudokuProgressContext = createContext<SudokuProgressContextValue | null>(null);

export const useSudokuProgress = (): SudokuProgressContextValue => {
    const ctx = useContext(SudokuProgressContext);
    if (!ctx) throw new Error('useSudokuProgress must be used within SudokuProgressProvider');
    return ctx;
};

export const SudokuProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stageProgress, setStageProgress] = useState<number>(() => {
        const stored = localStorage.getItem(LS_STAGE_KEY);
        return stored ? parseInt(stored, 10) || 1 : 1;
    });
    const [beginnerProgress, setBeginnerProgress] = useState<number>(() => {
        const stored = localStorage.getItem(LS_BEGINNER_KEY);
        return stored ? parseInt(stored, 10) || 0 : 0;
    });
    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;

            try {
                const progressRef = FIRESTORE_DOC(user.uid);
                const progressSnap = await getDoc(progressRef);

                let cloudStage = 1;
                let cloudBeginner = 0;

                if (progressSnap.exists()) {
                    const data = progressSnap.data();
                    cloudStage = data?.sudokuStageProgress ?? 1;
                    cloudBeginner = data?.beginnerProgress ?? 0;
                } else {
                    // Fallback to legacy top-level user doc
                    const userSnap = await getDoc(doc(db, 'users', user.uid));
                    cloudStage = userSnap.data()?.sudokuStageProgress ?? 1;
                }

                const localStage = parseInt(localStorage.getItem(LS_STAGE_KEY) ?? '1', 10) || 1;
                const localBeginner = parseInt(localStorage.getItem(LS_BEGINNER_KEY) ?? '0', 10) || 0;

                const mergedStage = Math.max(localStage, cloudStage);
                const mergedBeginner = Math.max(localBeginner, cloudBeginner);

                if (mergedStage !== localStage) {
                    localStorage.setItem(LS_STAGE_KEY, String(mergedStage));
                    setStageProgress(mergedStage);
                }
                if (mergedBeginner !== localBeginner) {
                    localStorage.setItem(LS_BEGINNER_KEY, String(mergedBeginner));
                    setBeginnerProgress(mergedBeginner);
                }

                // Write back to Firestore if local is ahead of cloud
                if (mergedStage !== cloudStage || mergedBeginner !== cloudBeginner) {
                    await setDoc(progressRef, {
                        sudokuStageProgress: mergedStage,
                        beginnerProgress: mergedBeginner,
                    }, { merge: true });
                }
            } catch (e) {
                console.error('SudokuProgressContext sync error:', e);
            }
        });
        return unsubscribe;
    }, []);

    const saveStageProgress = useCallback(async (nextLevel: number) => {
        localStorage.setItem(LS_STAGE_KEY, String(nextLevel));
        setStageProgress(nextLevel);
        const user = auth.currentUser;
        if (user) {
            await setDoc(FIRESTORE_DOC(user.uid), { sudokuStageProgress: nextLevel }, { merge: true });
        }
    }, []);

    const saveBeginnerProgress = useCallback(async (level: number) => {
        const current = parseInt(localStorage.getItem(LS_BEGINNER_KEY) ?? '0', 10) || 0;
        if (level <= current) return;
        const next = Math.min(level, 5); // max 5 stages
        localStorage.setItem(LS_BEGINNER_KEY, String(next));
        setBeginnerProgress(next);
        const user = auth.currentUser;
        if (user) {
            await setDoc(FIRESTORE_DOC(user.uid), { beginnerProgress: next }, { merge: true });
        }
    }, []);

    return (
        <SudokuProgressContext.Provider value={{ stageProgress, saveStageProgress, beginnerProgress, saveBeginnerProgress }}>
            {children}
        </SudokuProgressContext.Provider>
    );
};

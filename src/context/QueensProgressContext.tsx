import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const LS_KEY = 'queens_progress';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'queensProgress', 'data');

interface QueensProgressContextValue {
    queensProgress: number;
    isSynced: boolean;
    saveQueensProgress: (level: number) => Promise<void>;
}

const QueensProgressContext = createContext<QueensProgressContextValue | null>(null);

export const useQueensProgress = (): QueensProgressContextValue => {
    const ctx = useContext(QueensProgressContext);
    if (!ctx) throw new Error('useQueensProgress must be used within QueensProgressProvider');
    return ctx;
};

export const QueensProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queensProgress, setQueensProgress] = useState<number>(() => {
        const stored = localStorage.getItem(LS_KEY);
        return stored ? parseInt(stored, 10) || 0 : 0;
    });
    const [isSynced, setIsSynced] = useState(false);
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
                    setQueensProgress(merged);
                } else {
                    setQueensProgress(merged);
                }
                if (merged !== cloudLevel) {
                    await setDoc(FIRESTORE_DOC(user.uid), { clearedLevel: merged }, { merge: true });
                }
            } catch (e) {
                console.error('QueensProgressContext sync error:', e);
            }
            setIsSynced(true);
        });
        return unsubscribe;
    }, []);

    const saveQueensProgress = useCallback(async (level: number) => {
        const current = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
        if (level <= current) return;
        localStorage.setItem(LS_KEY, String(level));
        setQueensProgress(level);
        const user = auth.currentUser;
        if (user) {
            await setDoc(FIRESTORE_DOC(user.uid), { clearedLevel: level }, { merge: true });
        }
    }, []);

    return (
        <QueensProgressContext.Provider value={{ queensProgress, isSynced, saveQueensProgress }}>
            {children}
        </QueensProgressContext.Provider>
    );
};

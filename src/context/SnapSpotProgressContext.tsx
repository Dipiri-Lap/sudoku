import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const LS_KEY = 'snapspot_progress';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'snapspotProgress', 'data');

interface SnapSpotProgressContextValue {
    snapSpotProgress: number;
    isSynced: boolean;
    saveSnapSpotProgress: (stage: number) => Promise<void>;
}

const SnapSpotProgressContext = createContext<SnapSpotProgressContextValue | null>(null);

export const useSnapSpotProgress = (): SnapSpotProgressContextValue => {
    const ctx = useContext(SnapSpotProgressContext);
    if (!ctx) throw new Error('useSnapSpotProgress must be used within SnapSpotProgressProvider');
    return ctx;
};

export const SnapSpotProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [snapSpotProgress, setSnapSpotProgress] = useState<number>(() => {
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
                const cloudStage = snap.exists() ? (snap.data()?.clearedStage ?? 0) : 0;
                const localStage = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
                const merged = Math.max(localStage, cloudStage);
                if (merged !== localStage) {
                    localStorage.setItem(LS_KEY, String(merged));
                    setSnapSpotProgress(merged);
                } else {
                    setSnapSpotProgress(merged);
                }
                if (merged !== cloudStage) {
                    await setDoc(FIRESTORE_DOC(user.uid), { clearedStage: merged }, { merge: true });
                }
            } catch (e) {
                console.error('SnapSpotProgressContext sync error:', e);
            }
            setIsSynced(true);
        });
        return unsubscribe;
    }, []);

    const saveSnapSpotProgress = useCallback(async (stage: number) => {
        const current = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0;
        if (stage <= current) return;
        localStorage.setItem(LS_KEY, String(stage));
        setSnapSpotProgress(stage);
        const user = auth.currentUser;
        if (user) {
            await setDoc(FIRESTORE_DOC(user.uid), { clearedStage: stage }, { merge: true });
        }
    }, []);

    return (
        <SnapSpotProgressContext.Provider value={{ snapSpotProgress, isSynced, saveSnapSpotProgress }}>
            {children}
        </SnapSpotProgressContext.Provider>
    );
};

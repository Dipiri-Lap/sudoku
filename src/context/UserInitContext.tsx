import React, { createContext, useContext, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserInitContextValue {
    isInitialized: boolean;
}

const UserInitContext = createContext<UserInitContextValue | null>(null);

export const useUserInit = () => {
    const ctx = useContext(UserInitContext);
    if (!ctx) throw new Error('useUserInit must be used within UserInitProvider');
    return ctx;
};

export const UserInitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isInitialized, setIsInitialized] = React.useState(false);
    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) {
                if (!user) setIsInitialized(false);
                return;
            }
            syncedRef.current = true;

            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);

                if (!snap.exists()) {
                    // Initialize new user document with all essential fields
                    const initialData = {
                        uid: user.uid,
                        nickname: user.uid.slice(0, 8),
                        coins: parseInt(localStorage.getItem('puzzle_coins') ?? '0', 10) || 0,
                        sudokuStageProgress: parseInt(localStorage.getItem('sudoku_stage_progress') ?? '1', 10) || 1,
                        bestTimes: {},
                        guestProgress: {}, // Initialize as empty object
                        createdAt: new Date().toISOString(),
                    };

                    // Sync legacy best times from localStorage if they exist
                    const difficulties = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];
                    difficulties.forEach(diff => {
                        const saved = localStorage.getItem(`sudoku_best_time_${diff}`);
                        if (saved) {
                            (initialData.bestTimes as any)[diff] = parseInt(saved, 10);
                        }
                    });

                    await setDoc(userRef, initialData);
                } else {
                    // If document exists but missing uid/nickname, ensure they are set
                    const data = snap.data();
                    const updates: any = {};
                    if (!data.uid) updates.uid = user.uid;
                    if (!data.nickname) updates.nickname = user.uid.slice(0, 8);

                    if (Object.keys(updates).length > 0) {
                        await setDoc(userRef, updates, { merge: true });
                    }
                }
                setIsInitialized(true);
            } catch (e) {
                console.error('UserInitProvider error:', e);
            }
        });

        return unsubscribe;
    }, []);

    return (
        <UserInitContext.Provider value={{ isInitialized }}>
            {children}
        </UserInitContext.Provider>
    );
};

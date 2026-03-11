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
                        puzzlePower: 0,
                        createdAt: new Date().toISOString(),
                    };

                    await setDoc(userRef, initialData);
                } else {
                    // Document exists, but might be missing fields (partial creation/race condition)
                    const data = snap.data();
                    const updates: any = {};

                    if (data.uid === undefined) updates.uid = user.uid;
                    if (data.nickname === undefined) updates.nickname = user.uid.slice(0, 8);
                    if (data.coins === undefined) {
                        updates.coins = parseInt(localStorage.getItem('puzzle_coins') ?? '0', 10) || 0;
                    }
                    if (data.puzzlePower === undefined) updates.puzzlePower = 0;
                    if (data.createdAt === undefined) updates.createdAt = new Date().toISOString();

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

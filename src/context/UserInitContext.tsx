import React, { createContext, useContext, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, signInAnonymously } from '../firebase';

/**
 * 퍼즐력은 판을 깰 때 +1 씩 더해지지만 로그인 상태에서만 더해진다.
 * 비로그인으로 진행하다 로그인했거나 기기를 옮긴 사용자는 진행도만 앞서 있으므로,
 * 로그인할 때 서버가 진행도를 근거로 한 번 맞춰 준다.
 */
const syncMyPuzzlePower = httpsCallable<void, { changed: boolean }>(functions, 'syncMyPuzzlePower');

/** 게임별 진행도 동기화(각 Context 가 로그인 직후 수행)가 끝난 뒤에 맞춰야 한다 */
const PP_SYNC_DELAY_MS = 6000;

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
            if (!user) {
                signInAnonymously(auth).catch(console.error);
                return;
            }
            if (syncedRef.current) return;
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
            } catch (e) {
                console.error('UserInitProvider error:', e);
            } finally {
                setIsInitialized(true);
            }

            window.setTimeout(() => {
                syncMyPuzzlePower().catch(console.error);
            }, PP_SYNC_DELAY_MS);
        });

        return unsubscribe;
    }, []);

    return (
        <UserInitContext.Provider value={{ isInitialized }}>
            {children}
        </UserInitContext.Provider>
    );
};

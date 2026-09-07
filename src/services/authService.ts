import type { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, signInWithPopup, linkWithPopup, logEvent } from "../firebase";

const MIGRATION_KEYS = [
    'sudoku_stage_progress',
    'sudoku_best_time_Easy',
    'sudoku_best_time_Medium',
    'sudoku_best_time_Hard',
    'sudoku_best_time_Expert',
    'wordSort_tutorialDone',
    'puzzle_coins',
] as const;

export function hasGuestData(): boolean {
    return MIGRATION_KEYS.some(key => localStorage.getItem(key) !== null);
}

async function migrateLocalStorage(uid: string): Promise<void> {
    const guestProgress: Record<string, string | number | boolean> = {};
    let localCoins = 0;

    for (const key of MIGRATION_KEYS) {
        const value = localStorage.getItem(key);
        if (value !== null) {
            if (key === 'puzzle_coins') {
                localCoins = parseInt(value, 10) || 0;
            } else if (key === 'wordSort_tutorialDone') {
                guestProgress[key] = value === 'true';
            } else {
                const num = parseInt(value, 10);
                guestProgress[key] = isNaN(num) ? value : num;
            }
        }
    }

    // Proceed to sync regardless of hasData to always ensure a document exists with a nickname

    const userRef = doc(db, 'users', uid);
    const payload: Record<string, any> = { guestProgress, bestTimes: {} as Record<string, number> };

    // Consolidate legacy best times into bestTimes object
    for (const key of MIGRATION_KEYS) {
        if (key.startsWith('sudoku_best_time_')) {
            const diff = key.replace('sudoku_best_time_', '');
            const value = localStorage.getItem(key);
            if (value !== null) {
                payload.bestTimes[diff] = parseInt(value, 10);
                // Also keep in guestProgress for backward compatibility if needed, 
                // but primarily use bestTimes now.
            }
        }
    }

    // Always ensure a nickname exists
    payload.nickname = uid.slice(0, 8);
    payload.uid = uid;

    if (localCoins > 0) {
        payload.coins = localCoins;
    }

    // Use merge: true to avoid overwriting existing cloud data like different coins or progress
    await setDoc(userRef, payload, { merge: true });
}

export async function signInWithGoogle(): Promise<User> {
    const currentUser = auth.currentUser;
    // 익명 계정을 구글로 연결하는 건 '가입', 이미 있는 계정으로 들어오는 건 '로그인'.
    // 광고 성과를 볼 때 신규와 복귀를 섞으면 안 되므로 나눠서 보낸다.
    const isNewSignUp = currentUser?.isAnonymous === true;

    if (currentUser?.isAnonymous) {
        try {
            const result = await linkWithPopup(currentUser, googleProvider);
            await migrateLocalStorage(result.user.uid);
            logEvent('sign_up', { method: 'google' });
            return result.user;
        } catch (err: any) {
            // 이미 Google 계정이 존재하면 일반 로그인으로 전환
            if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
                const result = await signInWithPopup(auth, googleProvider);
                await migrateLocalStorage(result.user.uid);
                logEvent('login', { method: 'google' });
                return result.user;
            }
            throw err;
        }
    }

    const result = await signInWithPopup(auth, googleProvider);
    await migrateLocalStorage(result.user.uid);
    logEvent(isNewSignUp ? 'sign_up' : 'login', { method: 'google' });
    return result.user;
}

export async function signOut(): Promise<void> {
    await auth.signOut();
}

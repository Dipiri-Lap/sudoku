import type { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, signInWithPopup, linkWithPopup } from "../firebase";

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
    const payload: Record<string, any> = { guestProgress };

    // Always ensure a nickname exists
    payload.nickname = uid.slice(0, 8);

    if (localCoins > 0) {
        payload.coins = localCoins;
    }

    // Use merge: true to avoid overwriting existing cloud data like different coins or progress
    await setDoc(userRef, payload, { merge: true });
}

export async function signInWithGoogle(): Promise<User> {
    const currentUser = auth.currentUser;

    if (currentUser?.isAnonymous) {
        try {
            const result = await linkWithPopup(currentUser, googleProvider);
            await migrateLocalStorage(result.user.uid);
            return result.user;
        } catch (err: any) {
            // 이미 Google 계정이 존재하면 일반 로그인으로 전환
            if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
                const result = await signInWithPopup(auth, googleProvider);
                await migrateLocalStorage(result.user.uid);
                return result.user;
            }
            throw err;
        }
    }

    const result = await signInWithPopup(auth, googleProvider);
    await migrateLocalStorage(result.user.uid);
    return result.user;
}

export async function signOut(): Promise<void> {
    await auth.signOut();
}

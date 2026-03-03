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
    let hasData = false;
    let localCoins = 0;

    for (const key of MIGRATION_KEYS) {
        const value = localStorage.getItem(key);
        if (value !== null) {
            hasData = true;
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

    if (!hasData) return;

    const userRef = doc(db, 'users', uid);
    const payload: Record<string, any> = { guestProgress };
    if (localCoins > 0) {
        // CoinContext will handle Math.max merge on next auth change;
        // here we just ensure the field exists with at least the local value.
        payload.coins = localCoins;
    }
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

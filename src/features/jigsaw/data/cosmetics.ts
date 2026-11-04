import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

export type Grade = 'common' | 'rare' | 'elite' | 'epic' | 'legendary';

export const GRADES: Record<Grade, { label: string; color: string; price: number }> = {
    common: { label: '일반', color: '#94a3b8', price: 100 },
    rare: { label: '희귀', color: '#3b82f6', price: 200 },
    elite: { label: '고급', color: '#10b981', price: 300 },
    epic: { label: '영웅', color: '#a855f7', price: 500 },
    legendary: { label: '전설', color: '#f59e0b', price: 800 },
};
export const GRADE_ORDER: Grade[] = ['common', 'rare', 'elite', 'epic', 'legendary'];

export interface Cosmetic {
    id: string;
    name: string;
    grade: Grade;
    /** free items cost nothing regardless of grade */
    free?: boolean;
}

export const priceOf = (c: Cosmetic) => (c.free ? 0 : GRADES[c.grade].price);

interface StoreConfig {
    items: Cosmetic[];
    /** localStorage keys */
    lsUnlocked: string;
    lsSelected: string;
    /** fields on users/{uid} */
    cloudUnlocked: string;
    cloudSelected: string;
    defaultId: string;
}

/**
 * Owned / equipped cosmetics of one category. Same pattern as the SnapSpot marker shop:
 * localStorage first, merged with fields on users/{uid} on sign-in.
 */
export function useCosmeticStore(cfg: StoreConfig) {
    const { spendCoins } = useCoins();
    const valid = (id: string) => cfg.items.some((x) => x.id === id);
    const free = cfg.items.filter((x) => x.free).map((x) => x.id);

    const readUnlocked = (): string[] => {
        try {
            const v = JSON.parse(localStorage.getItem(cfg.lsUnlocked) ?? '[]');
            return Array.from(new Set([...free, ...(Array.isArray(v) ? v.filter(valid) : [])]));
        } catch {
            return [...free];
        }
    };
    const readSelected = (): string => {
        try {
            const v = localStorage.getItem(cfg.lsSelected);
            if (v && valid(v)) return v;
        } catch {
            /* ignore */
        }
        return cfg.defaultId;
    };
    const write = (k: string, v: string) => {
        try {
            localStorage.setItem(k, v);
        } catch {
            /* ignore */
        }
    };

    const [unlocked, setUnlocked] = useState<string[]>(readUnlocked);
    const [selected, setSelected] = useState<string>(readSelected);
    const synced = useRef(false);

    useEffect(() => {
        return onAuthStateChanged(auth, async (user) => {
            if (!user || synced.current) return;
            synced.current = true;
            try {
                const ref = doc(db, 'users', user.uid);
                const snap = await getDoc(ref);
                const data = snap.exists() ? snap.data() : {};
                const cloud: string[] = Array.isArray(data[cfg.cloudUnlocked]) ? data[cfg.cloudUnlocked] : [];
                const merged = Array.from(new Set([...readUnlocked(), ...cloud.filter(valid)]));
                setUnlocked(merged);
                write(cfg.lsUnlocked, JSON.stringify(merged));
                const cloudSel: string | undefined = data[cfg.cloudSelected];
                if (cloudSel && merged.includes(cloudSel)) {
                    setSelected(cloudSel);
                    write(cfg.lsSelected, cloudSel);
                }
                const payload: Record<string, unknown> = {};
                if (!merged.every((id) => cloud.includes(id))) payload[cfg.cloudUnlocked] = merged;
                if (!cloudSel) payload[cfg.cloudSelected] = readSelected();
                if (Object.keys(payload).length) await setDoc(ref, payload, { merge: true });
            } catch (e) {
                console.error('Tiny Pieces 꾸미기 동기화 실패', e);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveSelected = (id: string) => {
        setSelected(id);
        write(cfg.lsSelected, id);
        const user = auth.currentUser;
        if (user) setDoc(doc(db, 'users', user.uid), { [cfg.cloudSelected]: id }, { merge: true }).catch(console.error);
    };

    const select = useCallback(
        (id: string) => {
            if (unlocked.includes(id)) saveSelected(id);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [unlocked],
    );

    /** buy + equip. false when coins are short. */
    const buy = useCallback(
        async (id: string): Promise<boolean> => {
            const item = cfg.items.find((x) => x.id === id);
            if (!item) return false;
            if (!unlocked.includes(id)) {
                const price = priceOf(item);
                if (price > 0 && !(await spendCoins(price))) return false;
                const next = [...unlocked, id];
                setUnlocked(next);
                write(cfg.lsUnlocked, JSON.stringify(next));
                const user = auth.currentUser;
                if (user) setDoc(doc(db, 'users', user.uid), { [cfg.cloudUnlocked]: next }, { merge: true }).catch(console.error);
            }
            saveSelected(id);
            return true;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [unlocked, spendCoins],
    );

    return { items: cfg.items, unlocked, selected, select, buy };
}

export type CosmeticStore = ReturnType<typeof useCosmeticStore>;

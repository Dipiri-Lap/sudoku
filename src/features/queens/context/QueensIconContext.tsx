import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

export type IconGrade = 'common' | 'rare' | 'epic' | 'legendary';

export const GRADE_CONFIG: Record<IconGrade, { label: string; color: string; cost: number }> = {
    common:    { label: '일반',  color: '#94a3b8', cost: 0   },
    rare:      { label: '희귀',  color: '#3b82f6', cost: 100 },
    epic:      { label: '영웅',  color: '#a855f7', cost: 200 },
    legendary: { label: '전설',  color: '#f59e0b', cost: 300 },
};

export interface QueensIconDesign {
    id: string;
    grade: IconGrade;
}

export function getIconUrl(id: string): string {
    return `/assets/crown-quest/crown-icon/${id}.png`;
}

// 1~12: free / 13~24: rare / 25~36: epic / 37~48: legendary
export const queenIconDesigns: QueensIconDesign[] = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1),  grade: 'common'    as IconGrade })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: String(i + 13), grade: 'rare'       as IconGrade })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: String(i + 25), grade: 'epic'       as IconGrade })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: String(i + 37), grade: 'legendary'  as IconGrade })),
];

export const FREE_ICON_IDS = queenIconDesigns
    .filter(d => d.grade === 'common')
    .map(d => d.id);

const LS_UNLOCKED_KEY = 'queens_unlockedIcons';
const LS_SELECTED_KEY = 'queens_selectedIcon';

interface QueensIconContextValue {
    unlockedIcons: string[];
    selectedIconId: string;
    selectedIcon: QueensIconDesign;
    hasUnlocked: (id: string) => boolean;
    unlockIcon: (id: string) => Promise<boolean>;
    selectIcon: (id: string) => void;
}

const QueensIconContext = createContext<QueensIconContextValue | null>(null);

export const useQueensIcon = () => {
    const ctx = useContext(QueensIconContext);
    if (!ctx) throw new Error('useQueensIcon must be used within QueensIconProvider');
    return ctx;
};

export const QueensIconProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { spendCoins } = useCoins();

    const [selectedIconId, setSelectedIconId] = useState<string>(() =>
        localStorage.getItem(LS_SELECTED_KEY) || '1'
    );

    const [unlockedIcons, setUnlockedIcons] = useState<string[]>(() => {
        const stored = localStorage.getItem(LS_UNLOCKED_KEY);
        try {
            const parsed = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(parsed)) return [...FREE_ICON_IDS];
            return Array.from(new Set([...FREE_ICON_IDS, ...parsed]));
        } catch {
            return [...FREE_ICON_IDS];
        }
    });

    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || syncedRef.current) return;
            syncedRef.current = true;
            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);
                const cloudUnlocked: string[] = snap.exists() ? (snap.data().unlockedQueensIcons || []) : [];

                let localUnlocked: string[] = [];
                try { localUnlocked = JSON.parse(localStorage.getItem(LS_UNLOCKED_KEY) || '[]'); } catch {}

                const merged = Array.from(new Set([...FREE_ICON_IDS, ...localUnlocked, ...cloudUnlocked]));
                setUnlockedIcons(merged);
                localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(merged));

                const cloudSelected: string | null = snap.exists() ? (snap.data().selectedQueensIcon ?? null) : null;
                if (cloudSelected && merged.includes(cloudSelected)) {
                    setSelectedIconId(cloudSelected);
                    localStorage.setItem(LS_SELECTED_KEY, cloudSelected);
                }

                const payload: Record<string, unknown> = {};
                if (!merged.every(id => cloudUnlocked.includes(id))) payload.unlockedQueensIcons = merged;
                if (!cloudSelected) payload.selectedQueensIcon = localStorage.getItem(LS_SELECTED_KEY) || '1';
                if (Object.keys(payload).length > 0) await setDoc(userRef, payload, { merge: true });
            } catch (err) {
                console.error('Failed to sync queens icons', err);
            }
        });
        return unsubscribe;
    }, []);

    const hasUnlocked = useCallback((id: string) => unlockedIcons.includes(id), [unlockedIcons]);

    const selectIcon = useCallback((id: string) => {
        if (!unlockedIcons.includes(id)) return;
        setSelectedIconId(id);
        localStorage.setItem(LS_SELECTED_KEY, id);
        const user = auth.currentUser;
        if (user) {
            setDoc(doc(db, 'users', user.uid), { selectedQueensIcon: id }, { merge: true })
                .catch(console.error);
        }
    }, [unlockedIcons]);

    const unlockIcon = async (id: string): Promise<boolean> => {
        if (hasUnlocked(id)) return true;
        const design = queenIconDesigns.find(d => d.id === id);
        if (!design) return false;
        const cost = GRADE_CONFIG[design.grade].cost;

        if (cost > 0) {
            const success = await spendCoins(cost);
            if (!success) return false;
        }

        const newUnlocked = [...unlockedIcons, id];
        setUnlockedIcons(newUnlocked);
        localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(newUnlocked));

        const user = auth.currentUser;
        if (user) {
            setDoc(doc(db, 'users', user.uid), { unlockedQueensIcons: newUnlocked }, { merge: true })
                .catch(console.error);
        }
        selectIcon(id);
        return true;
    };

    const selectedIcon = queenIconDesigns.find(d => d.id === selectedIconId) ?? queenIconDesigns[0];

    return (
        <QueensIconContext.Provider value={{ unlockedIcons, selectedIconId, selectedIcon, hasUnlocked, unlockIcon, selectIcon }}>
            {children}
        </QueensIconContext.Provider>
    );
};

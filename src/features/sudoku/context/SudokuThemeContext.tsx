import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

export type ThemeGrade = 'free' | 'common' | 'rare' | 'epic';

export const THEME_GRADE_CONFIG: Record<ThemeGrade, { label: string; color: string; cost: number }> = {
    free:   { label: '무료',  color: '#4ade80', cost: 0   },
    common: { label: '일반',  color: '#94a3b8', cost: 100 },
    rare:   { label: '희귀',  color: '#3b82f6', cost: 200 },
    epic:   { label: '영웅',  color: '#a855f7', cost: 300 },
};

export interface SudokuTheme {
    id: string;
    name: string;
    grade: ThemeGrade;
    cssClass: string;
    preview: {
        bg: string;
        cell: string;
        line: string;
        text: string;
        accent: string;
    };
}

export const SUDOKU_THEMES: SudokuTheme[] = [
    {
        id: 'default',
        name: '기본',
        grade: 'free',
        cssClass: '',
        preview: { bg: '#f0f4f8', cell: '#ffffff', line: '#3b6b91', text: '#3b6b91', accent: '#bbdefb' },
    },
    {
        id: 'dark',
        name: '다크',
        grade: 'free',
        cssClass: 'theme-dark',
        preview: { bg: '#0f172a', cell: '#1e293b', line: '#475569', text: '#e2e8f0', accent: '#1e3a5f' },
    },
    {
        id: 'paper',
        name: '종이',
        grade: 'free',
        cssClass: 'theme-paper',
        preview: { bg: '#f5e6c8', cell: '#faf0dc', line: '#8b6914', text: '#3d2b1f', accent: '#d4b878' },
    },
    {
        id: 'gameboy',
        name: '게임보이',
        grade: 'epic',
        cssClass: 'theme-gameboy',
        preview: { bg: '#9bbc0f', cell: '#9bbc0f', line: '#0f380f', text: '#0f380f', accent: '#306230' },
    },
    {
        id: 'chalkboard',
        name: '칠판',
        grade: 'epic',
        cssClass: 'theme-chalkboard',
        preview: { bg: '#2b3d28', cell: '#2b3d28', line: 'rgba(220,215,185,0.5)', text: '#ede9d8', accent: '#3a5435' },
    },
    {
        id: 'blossom',
        name: '벚꽃',
        grade: 'common',
        cssClass: 'theme-blossom',
        preview: { bg: '#fce4ec', cell: '#fff0f5', line: '#c2185b', text: '#880e4f', accent: '#f8bbd0' },
    },
    {
        id: 'ocean',
        name: '오션',
        grade: 'common',
        cssClass: 'theme-ocean',
        preview: { bg: '#0c2340', cell: '#0d2b4e', line: '#00bcd4', text: '#e0f7fa', accent: '#1a3a5c' },
    },
    {
        id: 'mocha',
        name: '모카',
        grade: 'common',
        cssClass: 'theme-mocha',
        preview: { bg: '#3e2723', cell: '#4e342e', line: '#d7ccc8', text: '#efebe9', accent: '#5d4037' },
    },
    {
        id: 'dusk',
        name: '황혼',
        grade: 'common',
        cssClass: 'theme-dusk',
        preview: { bg: '#1a1a2e', cell: '#16213e', line: '#ff6b35', text: '#ffd4b8', accent: '#2d1b4e' },
    },
    {
        id: 'mintchoco',
        name: '민트초코',
        grade: 'common',
        cssClass: 'theme-mintchoco',
        preview: { bg: '#e8f5e9', cell: '#f1f8f0', line: '#4e342e', text: '#3e2723', accent: '#c8e6c9' },
    },
    {
        id: 'newspaper',
        name: '신문지',
        grade: 'rare',
        cssClass: 'theme-newspaper',
        preview: { bg: '#ede8d0', cell: '#f5f0e0', line: '#1a1a1a', text: '#1a1a1a', accent: '#d4cdb0' },
    },
    {
        id: 'blueprint',
        name: '설계도',
        grade: 'epic',
        cssClass: 'theme-blueprint',
        preview: { bg: '#003369', cell: '#004080', line: '#ffffff', text: '#ffffff', accent: '#004d99' },
    },
    {
        id: 'terminal',
        name: '단말기',
        grade: 'epic',
        cssClass: 'theme-terminal',
        preview: { bg: '#0d1117', cell: '#0d1117', line: '#00ff41', text: '#00ff41', accent: '#161b22' },
    },
    {
        id: 'watercolor',
        name: '수채화',
        grade: 'rare',
        cssClass: 'theme-watercolor',
        preview: { bg: '#eef2ff', cell: '#f8faff', line: '#a5b4fc', text: '#3730a3', accent: '#dbeafe' },
    },
    {
        id: 'hanji',
        name: '한지',
        grade: 'rare',
        cssClass: 'theme-hanji',
        preview: { bg: '#e5d5b5', cell: '#ecdfc4', line: '#2c1810', text: '#1a0f08', accent: '#c5b080' },
    },
    {
        id: 'space',
        name: '우주',
        grade: 'rare',
        cssClass: 'theme-space',
        preview: { bg: '#050510', cell: '#0a0a1f', line: '#6b46c1', text: '#e8d5ff', accent: '#1e0a4e' },
    },
    {
        id: 'notepad',
        name: '메모장',
        grade: 'rare',
        cssClass: 'theme-notepad',
        preview: { bg: '#fef9c3', cell: '#fef9c3', line: '#1d4ed8', text: '#1f2937', accent: '#fde047' },
    },
    {
        id: 'highlighter',
        name: '형광펜',
        grade: 'rare',
        cssClass: 'theme-highlighter',
        preview: { bg: '#fffde7', cell: '#ffffff', line: '#111827', text: '#111827', accent: '#facc15' },
    },
];

export const FREE_THEME_IDS = SUDOKU_THEMES.filter(t => t.grade === 'free').map(t => t.id);
export const ALL_THEME_CLASSES = SUDOKU_THEMES.map(t => t.cssClass).filter(Boolean);

const LS_UNLOCKED_KEY = 'sudoku_unlockedThemes';
const LS_SELECTED_KEY = 'sudoku_selectedTheme';

interface SudokuThemeContextValue {
    unlockedThemes: string[];
    selectedThemeId: string;
    selectedTheme: SudokuTheme;
    hasUnlocked: (id: string) => boolean;
    unlockTheme: (id: string) => Promise<boolean>;
    selectTheme: (id: string) => void;
}

const SudokuThemeContext = createContext<SudokuThemeContextValue | null>(null);

export const useSudokuTheme = () => {
    const ctx = useContext(SudokuThemeContext);
    if (!ctx) throw new Error('useSudokuTheme must be used within SudokuThemeProvider');
    return ctx;
};

export const SudokuThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { spendCoins } = useCoins();

    const [selectedThemeId, setSelectedThemeId] = useState<string>(() =>
        localStorage.getItem(LS_SELECTED_KEY) || 'default'
    );

    const [unlockedThemes, setUnlockedThemes] = useState<string[]>(() => {
        const stored = localStorage.getItem(LS_UNLOCKED_KEY);
        try {
            const parsed = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(parsed)) return [...FREE_THEME_IDS];
            return Array.from(new Set([...FREE_THEME_IDS, ...parsed]));
        } catch {
            return [...FREE_THEME_IDS];
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
                const cloudUnlocked: string[] = snap.exists() ? (snap.data().unlockedSudokuThemes || []) : [];

                let localUnlocked: string[] = [];
                try { localUnlocked = JSON.parse(localStorage.getItem(LS_UNLOCKED_KEY) || '[]'); } catch {}

                const merged = Array.from(new Set([...FREE_THEME_IDS, ...localUnlocked, ...cloudUnlocked]));
                setUnlockedThemes(merged);
                localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(merged));

                const cloudSelected: string | null = snap.exists() ? (snap.data().selectedSudokuTheme ?? null) : null;
                if (cloudSelected && merged.includes(cloudSelected)) {
                    setSelectedThemeId(cloudSelected);
                    localStorage.setItem(LS_SELECTED_KEY, cloudSelected);
                }

                const payload: Record<string, unknown> = {};
                if (!merged.every(id => cloudUnlocked.includes(id))) payload.unlockedSudokuThemes = merged;
                if (!cloudSelected) payload.selectedSudokuTheme = localStorage.getItem(LS_SELECTED_KEY) || 'default';
                if (Object.keys(payload).length > 0) await setDoc(userRef, payload, { merge: true });
            } catch (err) {
                console.error('Failed to sync sudoku themes', err);
            }
        });
        return unsubscribe;
    }, []);

    const hasUnlocked = useCallback((id: string) => unlockedThemes.includes(id), [unlockedThemes]);

    const selectTheme = useCallback((id: string) => {
        if (!unlockedThemes.includes(id)) return;
        setSelectedThemeId(id);
        localStorage.setItem(LS_SELECTED_KEY, id);
        const user = auth.currentUser;
        if (user) {
            setDoc(doc(db, 'users', user.uid), { selectedSudokuTheme: id }, { merge: true })
                .catch(console.error);
        }
    }, [unlockedThemes]);

    const unlockTheme = async (id: string): Promise<boolean> => {
        if (hasUnlocked(id)) return true;
        const theme = SUDOKU_THEMES.find(t => t.id === id);
        if (!theme) return false;
        const cost = THEME_GRADE_CONFIG[theme.grade].cost;

        if (cost > 0) {
            const success = await spendCoins(cost);
            if (!success) return false;
        }

        const newUnlocked = [...unlockedThemes, id];
        setUnlockedThemes(newUnlocked);
        localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(newUnlocked));

        const user = auth.currentUser;
        if (user) {
            setDoc(doc(db, 'users', user.uid), { unlockedSudokuThemes: newUnlocked }, { merge: true })
                .catch(console.error);
        }
        selectTheme(id);
        return true;
    };

    const selectedTheme = SUDOKU_THEMES.find(t => t.id === selectedThemeId) ?? SUDOKU_THEMES[0];

    return (
        <SudokuThemeContext.Provider value={{ unlockedThemes, selectedThemeId, selectedTheme, hasUnlocked, unlockTheme, selectTheme }}>
            {children}
        </SudokuThemeContext.Provider>
    );
};

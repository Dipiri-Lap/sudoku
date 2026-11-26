import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';
import i18n from '../../../i18n';

export type ThemeGrade = 'free' | 'common' | 'rare' | 'epic' | 'legendary';

export const THEME_GRADE_CONFIG: Record<ThemeGrade, { label: string; color: string; cost: number }> = {
    free:   { label: i18n.t('sudoku:theme.grades.free'),  color: '#4ade80', cost: 0   },
    common: { label: i18n.t('sudoku:theme.grades.common'),  color: '#94a3b8', cost: 100 },
    rare:   { label: i18n.t('sudoku:theme.grades.rare'),  color: '#3b82f6', cost: 200 },
    epic:   { label: i18n.t('sudoku:theme.grades.epic'),  color: '#a855f7', cost: 300 },
    legendary: { label: i18n.t('sudoku:theme.grades.legendary'), color: '#f59e0b', cost: 500 },
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
        name: i18n.t('sudoku:theme.names.default'),
        grade: 'free',
        cssClass: '',
        preview: { bg: '#f0f4f8', cell: '#ffffff', line: '#3b6b91', text: '#3b6b91', accent: '#bbdefb' },
    },
    {
        id: 'dark',
        name: i18n.t('sudoku:theme.names.dark'),
        grade: 'free',
        cssClass: 'theme-dark',
        preview: { bg: '#0f172a', cell: '#1e293b', line: '#475569', text: '#e2e8f0', accent: '#1e3a5f' },
    },
    {
        id: 'paper',
        name: i18n.t('sudoku:theme.names.paper'),
        grade: 'free',
        cssClass: 'theme-paper',
        preview: { bg: '#f5e6c8', cell: '#faf0dc', line: '#8b6914', text: '#3d2b1f', accent: '#d4b878' },
    },
    {
        id: 'contrast',
        name: i18n.t('sudoku:theme.names.contrast'),
        grade: 'free',
        cssClass: 'theme-contrast',
        preview: { bg: '#000000', cell: '#ffffff', line: '#000000', text: '#000000', accent: '#ffe600' },
    },
    {
        id: 'blossom',
        name: i18n.t('sudoku:theme.names.blossom'),
        grade: 'common',
        cssClass: 'theme-blossom',
        preview: { bg: '#fce4ec', cell: '#fff0f5', line: '#c2185b', text: '#880e4f', accent: '#f8bbd0' },
    },
    {
        id: 'ocean',
        name: i18n.t('sudoku:theme.names.ocean'),
        grade: 'common',
        cssClass: 'theme-ocean',
        preview: { bg: '#0c2340', cell: '#0d2b4e', line: '#00bcd4', text: '#e0f7fa', accent: '#1a3a5c' },
    },
    {
        id: 'lavender',
        name: i18n.t('sudoku:theme.names.lavender'),
        grade: 'common',
        cssClass: 'theme-lavender',
        preview: { bg: '#f3e8ff', cell: '#faf5ff', line: '#7c3aed', text: '#4c1d95', accent: '#ddd0fb' },
    },
    {
        id: 'mocha',
        name: i18n.t('sudoku:theme.names.mocha'),
        grade: 'common',
        cssClass: 'theme-mocha',
        preview: { bg: '#3e2723', cell: '#4e342e', line: '#d7ccc8', text: '#efebe9', accent: '#5d4037' },
    },
    {
        id: 'mintchoco',
        name: i18n.t('sudoku:theme.names.mintchoco'),
        grade: 'common',
        cssClass: 'theme-mintchoco',
        preview: { bg: '#e8f5e9', cell: '#f1f8f0', line: '#4e342e', text: '#3e2723', accent: '#c8e6c9' },
    },
    {
        id: 'forest',
        name: i18n.t('sudoku:theme.names.forest'),
        grade: 'common',
        cssClass: 'theme-forest',
        preview: { bg: '#13241a', cell: '#1a3123', line: '#7cc796', text: '#e3f1e6', accent: '#2d5a3c' },
    },
    {
        id: 'apricot',
        name: i18n.t('sudoku:theme.names.apricot'),
        grade: 'common',
        cssClass: 'theme-apricot',
        preview: { bg: '#ffedd5', cell: '#fff7ed', line: '#ea7a2e', text: '#7c3a10', accent: '#fed7aa' },
    },
    {
        id: 'notepad',
        name: i18n.t('sudoku:theme.names.notepad'),
        grade: 'common',
        cssClass: 'theme-notepad',
        preview: { bg: '#fef9c3', cell: '#fef9c3', line: '#1d4ed8', text: '#1f2937', accent: '#fde047' },
    },
    {
        id: 'watercolor',
        name: i18n.t('sudoku:theme.names.watercolor'),
        grade: 'common',
        cssClass: 'theme-watercolor',
        preview: { bg: '#eef2ff', cell: '#f8faff', line: '#a5b4fc', text: '#3730a3', accent: '#dbeafe' },
    },
    {
        id: 'newspaper',
        name: i18n.t('sudoku:theme.names.newspaper'),
        grade: 'rare',
        cssClass: 'theme-newspaper',
        preview: { bg: '#ede8d0', cell: '#f5f0e0', line: '#1a1a1a', text: '#1a1a1a', accent: '#d4cdb0' },
    },
    {
        id: 'dusk',
        name: i18n.t('sudoku:theme.names.dusk'),
        grade: 'rare',
        cssClass: 'theme-dusk',
        preview: { bg: '#1a1a2e', cell: '#16213e', line: '#ff6b35', text: '#ffd4b8', accent: '#2d1b4e' },
    },
    {
        id: 'manuscript',
        name: i18n.t('sudoku:theme.names.manuscript'),
        grade: 'rare',
        cssClass: 'theme-manuscript',
        preview: { bg: '#fbf7ee', cell: '#fffdf7', line: '#d9534f', text: '#2b2522', accent: '#f9d9cf' },
    },
    {
        id: 'blueprint',
        name: i18n.t('sudoku:theme.names.blueprint'),
        grade: 'rare',
        cssClass: 'theme-blueprint',
        preview: { bg: '#003369', cell: '#004080', line: '#ffffff', text: '#ffffff', accent: '#004d99' },
    },
    {
        id: 'hanji',
        name: i18n.t('sudoku:theme.names.hanji'),
        grade: 'rare',
        cssClass: 'theme-hanji',
        preview: { bg: '#e5d5b5', cell: '#ecdfc4', line: '#2c1810', text: '#1a0f08', accent: '#c5b080' },
    },
    {
        id: 'highlighter',
        name: i18n.t('sudoku:theme.names.highlighter'),
        grade: 'rare',
        cssClass: 'theme-highlighter',
        preview: { bg: '#fffde7', cell: '#ffffff', line: '#111827', text: '#111827', accent: '#facc15' },
    },
    {
        id: 'picnic',
        name: i18n.t('sudoku:theme.names.picnic'),
        grade: 'rare',
        cssClass: 'theme-picnic',
        preview: { bg: '#fdf2f2', cell: '#ffffff', line: '#d64545', text: '#4a2222', accent: '#f9d2d2' },
    },
    {
        id: 'gameboy',
        name: i18n.t('sudoku:theme.names.gameboy'),
        grade: 'epic',
        cssClass: 'theme-gameboy',
        preview: { bg: '#9bbc0f', cell: '#9bbc0f', line: '#0f380f', text: '#0f380f', accent: '#306230' },
    },
    {
        id: 'space',
        name: i18n.t('sudoku:theme.names.space'),
        grade: 'epic',
        cssClass: 'theme-space',
        preview: { bg: '#050510', cell: '#0a0a1f', line: '#6b46c1', text: '#e8d5ff', accent: '#1e0a4e' },
    },
    {
        id: 'chalkboard',
        name: i18n.t('sudoku:theme.names.chalkboard'),
        grade: 'epic',
        cssClass: 'theme-chalkboard',
        preview: { bg: '#2b3d28', cell: '#2b3d28', line: 'rgba(220,215,185,0.5)', text: '#ede9d8', accent: '#3a5435' },
    },
    {
        id: 'neon',
        name: i18n.t('sudoku:theme.names.neon'),
        grade: 'epic',
        cssClass: 'theme-neon',
        preview: { bg: '#0b0614', cell: '#120a20', line: '#ff4fd8', text: '#3ef2ff', accent: '#2c1350' },
    },
    {
        id: 'terminal',
        name: i18n.t('sudoku:theme.names.terminal'),
        grade: 'epic',
        cssClass: 'theme-terminal',
        preview: { bg: '#0d1117', cell: '#0d1117', line: '#00ff41', text: '#00ff41', accent: '#161b22' },
    },
    {
        id: 'winter',
        name: i18n.t('sudoku:theme.names.winter'),
        grade: 'epic',
        cssClass: 'theme-winter',
        preview: { bg: '#1d2b44', cell: '#f4f8fc', line: '#9cc6ec', text: '#1d2b44', accent: '#c9def3' },
    },
    {
        id: 'aquarium',
        name: i18n.t('sudoku:theme.names.aquarium'),
        grade: 'epic',
        cssClass: 'theme-aquarium',
        preview: { bg: '#073b4c', cell: '#0b4558', line: '#5ee0d0', text: '#e6fbf8', accent: '#156b85' },
    },
    {
        id: 'gold',
        name: i18n.t('sudoku:theme.names.gold'),
        grade: 'legendary',
        cssClass: 'theme-gold',
        preview: { bg: '#1c1710', cell: '#fbf6e9', line: '#c9a227', text: '#3b2f12', accent: '#ecd9a4' },
    },
    {
        id: 'dawn',
        name: i18n.t('sudoku:theme.names.dawn'),
        grade: 'legendary',
        cssClass: 'theme-dawn',
        preview: { bg: '#6b4e8a', cell: '#fffaf3', line: '#e0875a', text: '#3a2c3f', accent: '#f9d6b8' },
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
    /** 미리 써보기 중인 테마(없으면 null). 게임 화면은 activeTheme 을 칠한다. */
    previewThemeId: string | null;
    previewEndsAt: number | null;
    activeTheme: SudokuTheme;
    startPreview: (id: string) => void;
    stopPreview: () => void;
}

export const PREVIEW_SECONDS = 30;

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

    const applySelected = (id: string) => {
        setSelectedThemeId(id);
        localStorage.setItem(LS_SELECTED_KEY, id);
        const user = auth.currentUser;
        if (user) {
            setDoc(doc(db, 'users', user.uid), { selectedSudokuTheme: id }, { merge: true })
                .catch(console.error);
        }
    };

    // ── 미리 써보기: 잠긴 테마를 PREVIEW_SECONDS 동안 지금 판에 입혀 본다 ──
    const [preview, setPreview] = useState<{ id: string; endsAt: number } | null>(null);
    const startPreview = useCallback((id: string) => {
        setPreview({ id, endsAt: Date.now() + PREVIEW_SECONDS * 1000 });
    }, []);
    const stopPreview = useCallback(() => setPreview(null), []);
    useEffect(() => {
        if (!preview) return;
        const t = setTimeout(() => setPreview(null), Math.max(0, preview.endsAt - Date.now()));
        return () => clearTimeout(t);
    }, [preview]);

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
        // selectTheme 은 아직 갱신 전 unlockedThemes 를 보고 막혀서 구매 직후 적용이 안 되던 문제 → 직접 적용
        applySelected(id);
        setPreview(null);
        return true;
    };

    const selectedTheme = SUDOKU_THEMES.find(t => t.id === selectedThemeId) ?? SUDOKU_THEMES[0];
    const activeTheme = (preview && SUDOKU_THEMES.find(t => t.id === preview.id)) || selectedTheme;

    return (
        <SudokuThemeContext.Provider value={{
            unlockedThemes, selectedThemeId, selectedTheme, hasUnlocked, unlockTheme, selectTheme,
            previewThemeId: preview?.id ?? null, previewEndsAt: preview?.endsAt ?? null, activeTheme, startPreview, stopPreview,
        }}>
            {children}
        </SudokuThemeContext.Provider>
    );
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

/**
 * 크로썸 테마.
 *
 * 스도쿠와 같은 등급·해금·동기화 구조를 쓴다. 다만 크로썸은 색이 맡는 역할이 많아서
 * (배경·패널·주어진 칸·빈칸·타일·완성·오답) 미리보기에도 그만큼 보여준다.
 *
 * 스도쿠는 Provider 로 감싸지만 크로썸은 게임 화면 한 곳에서만 쓰므로 훅 하나로 둔다.
 */

export type ThemeGrade = 'free' | 'common' | 'rare' | 'epic';

export const GRADE_CONFIG: Record<ThemeGrade, { label: string; color: string; cost: number }> = {
  free: { label: '무료', color: '#4ade80', cost: 0 },
  common: { label: '일반', color: '#94a3b8', cost: 100 },
  rare: { label: '희귀', color: '#3b82f6', cost: 200 },
  epic: { label: '영웅', color: '#a855f7', cost: 300 },
};

export const GRADE_ORDER: ThemeGrade[] = ['free', 'common', 'rare', 'epic'];

export interface CrossumTheme {
  id: string;
  name: string;
  grade: ThemeGrade;
  /** .cm-page 에 함께 붙일 클래스. 기본 테마는 빈 문자열 */
  cssClass: string;
  /** 선택 목록에 보여줄 미리보기 색 */
  preview: { bg: string; panel: string; given: string; tile: string; solved: string };
}

export const CROSSUM_THEMES: CrossumTheme[] = [
  {
    id: 'default', name: '기본', grade: 'free', cssClass: '',
    preview: { bg: '#f6e6c8', panel: '#fffaef', given: '#ffd873', tile: '#cdf0c4', solved: '#a9e59a' },
  },
  {
    id: 'dark', name: '다크', grade: 'free', cssClass: 'cm-theme-dark',
    preview: { bg: '#000000', panel: '#1c1c1e', given: '#3a3a3c', tile: '#3a3a3c', solved: '#1f5c2e' },
  },
  {
    id: 'grid', name: '모눈종이', grade: 'free', cssClass: 'cm-theme-grid',
    preview: { bg: '#eaf2fb', panel: '#ffffff', given: '#dce9fa', tile: '#eef6e9', solved: '#cbe8bd' },
  },
  {
    id: 'chalk', name: '칠판', grade: 'common', cssClass: 'cm-theme-chalk',
    preview: { bg: '#1e2c21', panel: '#2b3d2e', given: '#3d5440', tile: '#435c45', solved: '#4d7a45' },
  },
  {
    id: 'blossom', name: '벚꽃', grade: 'common', cssClass: 'cm-theme-blossom',
    preview: { bg: '#fce4ec', panel: '#fffafc', given: '#fbd0de', tile: '#e8f3dd', solved: '#bfe4a8' },
  },
  {
    id: 'ocean', name: '오션', grade: 'common', cssClass: 'cm-theme-ocean',
    preview: { bg: '#d3ebef', panel: '#f6fcfd', given: '#bfe6ee', tile: '#d6f0dd', solved: '#a9e5c0' },
  },
  {
    id: 'abacus', name: '주판', grade: 'rare', cssClass: 'cm-theme-abacus',
    preview: { bg: '#d8bd97', panel: '#7b4a24', given: '#b5763c', tile: '#c0392b', solved: '#3f7d3a' },
  },
  {
    id: 'newspaper', name: '신문', grade: 'rare', cssClass: 'cm-theme-newspaper',
    preview: { bg: '#e2dbc9', panel: '#f6f2e7', given: '#ded7c4', tile: '#e6e0cf', solved: '#b9d6a8' },
  },
  {
    id: 'hanji', name: '한지', grade: 'rare', cssClass: 'cm-theme-hanji',
    preview: { bg: '#ddceac', panel: '#f1e7d2', given: '#e0cea6', tile: '#d9e3c4', solved: '#bcd39a' },
  },
  {
    id: 'lcd', name: '계산기', grade: 'epic', cssClass: 'cm-theme-lcd',
    preview: { bg: '#2b3729', panel: '#adc178', given: '#9cb268', tile: '#4a5a46', solved: '#6d9a3f' },
  },
  {
    id: 'blueprint', name: '설계도', grade: 'epic', cssClass: 'cm-theme-blueprint',
    preview: { bg: '#002548', panel: '#003b73', given: '#004f96', tile: '#005ba8', solved: '#1d6e4a' },
  },
  {
    id: 'neon', name: '네온', grade: 'epic', cssClass: 'cm-theme-neon',
    preview: { bg: '#0a0a12', panel: '#16162e', given: '#23234a', tile: '#16384a', solved: '#10513c' },
  },
];

const THEME_MAP: Record<string, CrossumTheme> = Object.fromEntries(
  CROSSUM_THEMES.map(t => [t.id, t])
);

export function themeCost(theme: CrossumTheme): number {
  return GRADE_CONFIG[theme.grade].cost;
}

const LS_SELECTED = 'crossum_theme';
const LS_UNLOCKED = 'crossum_unlocked_themes';

/** 무료 등급은 언제나 열려 있다 */
const FREE_IDS = CROSSUM_THEMES.filter(t => t.grade === 'free').map(t => t.id);

function readUnlocked(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_UNLOCKED) || '[]');
    if (!Array.isArray(parsed)) return [...FREE_IDS];
    return [...new Set([...FREE_IDS, ...parsed])];
  } catch {
    return [...FREE_IDS];
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 실패는 무시 — 이번 세션 동안만 유지된다
  }
}

export function useCrossumTheme() {
  const { spendCoins } = useCoins();

  const [themeId, setThemeId] = useState<string>(() => {
    try {
      const id = localStorage.getItem(LS_SELECTED);
      return id && THEME_MAP[id] ? id : 'default';
    } catch {
      return 'default';
    }
  });
  const [unlocked, setUnlocked] = useState<string[]>(readUnlocked);

  const syncedRef = useRef(false);

  // 로그인하면 기기에 저장된 해금 목록과 서버 것을 합친다 (양쪽 다 잃지 않게)
  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user || syncedRef.current) return;
      syncedRef.current = true;
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const cloudUnlocked: string[] = snap.exists() ? (snap.data().unlockedCrossumThemes || []) : [];
        const merged = [...new Set([...readUnlocked(), ...cloudUnlocked])];
        setUnlocked(merged);
        write(LS_UNLOCKED, JSON.stringify(merged));

        const cloudSelected: string | null = snap.exists() ? (snap.data().selectedCrossumTheme ?? null) : null;
        if (cloudSelected && THEME_MAP[cloudSelected] && merged.includes(cloudSelected)) {
          setThemeId(cloudSelected);
          write(LS_SELECTED, cloudSelected);
        }

        const payload: Record<string, unknown> = {};
        if (!merged.every(id => cloudUnlocked.includes(id))) payload.unlockedCrossumThemes = merged;
        if (!cloudSelected) payload.selectedCrossumTheme = localStorage.getItem(LS_SELECTED) || 'default';
        if (Object.keys(payload).length > 0) await setDoc(userRef, payload, { merge: true });
      } catch (err) {
        console.error('크로썸 테마 동기화 실패', err);
      }
    });
  }, []);

  const hasUnlocked = useCallback((id: string) => unlocked.includes(id), [unlocked]);

  const selectTheme = useCallback((id: string) => {
    if (!THEME_MAP[id] || !unlocked.includes(id)) return;
    setThemeId(id);
    write(LS_SELECTED, id);
    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid), { selectedCrossumTheme: id }, { merge: true }).catch(console.error);
    }
  }, [unlocked]);

  /** 코인을 쓰고 해금한 뒤 바로 적용한다. 코인이 모자라면 false */
  const unlockTheme = useCallback(async (id: string): Promise<boolean> => {
    if (unlocked.includes(id)) return true;
    const theme = THEME_MAP[id];
    if (!theme) return false;

    const cost = themeCost(theme);
    if (cost > 0 && !(await spendCoins(cost))) return false;

    const merged = [...unlocked, id];
    setUnlocked(merged);
    write(LS_UNLOCKED, JSON.stringify(merged));
    setThemeId(id);
    write(LS_SELECTED, id);

    const user = auth.currentUser;
    if (user) {
      setDoc(
        doc(db, 'users', user.uid),
        { unlockedCrossumThemes: merged, selectedCrossumTheme: id },
        { merge: true }
      ).catch(console.error);
    }
    return true;
  }, [unlocked, spendCoins]);

  const theme = THEME_MAP[themeId] ?? CROSSUM_THEMES[0];
  return { themeId, theme, unlocked, hasUnlocked, selectTheme, unlockTheme };
}

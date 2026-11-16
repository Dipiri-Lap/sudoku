import type { Difficulty } from '../../../engine/generator';
import { DAILY_MONTHS, monthKeyOf } from './months';

/** 스도쿠 달(9~10월)의 문제. game 필드가 없는 예전 데이터는 모두 스도쿠다. */
export interface SudokuDailyPuzzle {
    date: string; // YYYY-MM-DD
    game?: 'sudoku';
    difficulty: Difficulty;
    board: (number | null)[][];
    solution: number[][];
}

/** 워드스택 달(11월)의 문제. level 은 levels.json 의 한 레벨과 같은 모양이다. */
export interface WordSortDailyLevel {
    id: number;
    maxMoves: number;
    slots: number;
    categories: { id: string; name: string; target: number; words: string[] }[];
}

export interface WordSortDailyPuzzle {
    date: string;
    game: 'word-sort';
    difficulty: '보통' | '어려움';
    level: WordSortDailyLevel;
}

export type DailyPuzzle = SudokuDailyPuzzle | WordSortDailyPuzzle;

/** 그 문제의 게임(game 필드가 없으면 스도쿠). */
export const dailyGameOfPuzzle = (p: DailyPuzzle): string => p.game ?? 'sudoku';

export const isWordSortDaily = (p: DailyPuzzle | null | undefined): p is WordSortDailyPuzzle => p?.game === 'word-sort';

/** 문제가 준비된 달 (캘린더의 이전/다음 달 이동 범위) */
export const AVAILABLE_MONTHS = Object.keys(DAILY_MONTHS).sort();

const cache = new Map<string, DailyPuzzle[]>();

export function hasMonth(monthKey: string): boolean {
    return monthKey in DAILY_MONTHS;
}

export async function loadMonth(monthKey: string): Promise<DailyPuzzle[]> {
    const cached = cache.get(monthKey);
    if (cached) return cached;

    // 문제 파일이 아직 없는 달(로컬 날짜가 한국보다 앞선 사용자의 다음 달 등)은 빈 목록.
    const entry = DAILY_MONTHS[monthKey];
    if (!entry) return [];

    let mod: { default: unknown };
    try {
        mod = await entry.load();
    } catch (e) {
        // 배포 직후 옛 청크를 못 찾는 경우 등. 화면은 "문제 없음"으로 둔다.
        console.error('daily loadMonth error:', e);
        return [];
    }
    const list = mod.default as DailyPuzzle[];
    cache.set(monthKey, list);
    return list;
}

export async function getDailyPuzzle(date: string): Promise<DailyPuzzle | null> {
    const list = await loadMonth(monthKeyOf(date));
    return list.find(p => p.date === date) ?? null;
}

// 날짜 유틸·월 등록부는 months.ts 에 있다(locale.ts 도 읽는다). 기존 import 경로 호환용으로 다시 내보낸다.
export { toDateKey, todayKey, monthKeyOf, dailyGameOf, type DailyGameId } from './months';

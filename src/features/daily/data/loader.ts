import type { Difficulty } from '../../../engine/generator';

export interface DailyPuzzle {
    date: string; // YYYY-MM-DD
    difficulty: Difficulty;
    board: (number | null)[][];
    solution: number[][];
}

/**
 * 월 단위 청크로 나눠 두고 필요한 달만 불러온다.
 * 1년치를 static import 하면 초기 번들에 그대로 들어간다.
 * 달을 추가할 때 여기에 한 줄만 등록하면 된다.
 */
const MONTH_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
    '2026-09': () => import('../../../data/daily/2026-09.json'),
};

/** 문제가 준비된 달 (캘린더의 이전/다음 달 이동 범위) */
export const AVAILABLE_MONTHS = Object.keys(MONTH_LOADERS).sort();

const cache = new Map<string, DailyPuzzle[]>();

export function hasMonth(monthKey: string): boolean {
    return monthKey in MONTH_LOADERS;
}

export async function loadMonth(monthKey: string): Promise<DailyPuzzle[]> {
    const cached = cache.get(monthKey);
    if (cached) return cached;

    const loader = MONTH_LOADERS[monthKey];
    if (!loader) return [];

    const mod = await loader();
    const list = mod.default as DailyPuzzle[];
    cache.set(monthKey, list);
    return list;
}

export async function getDailyPuzzle(date: string): Promise<DailyPuzzle | null> {
    const list = await loadMonth(monthKeyOf(date));
    return list.find(p => p.date === date) ?? null;
}

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────
// 데일리는 사용자 로컬 날짜 기준이다. toISOString() 은 UTC 라 한국 시간
// 오전 9시 이전에 어제 문제가 나온다 - 여기서는 절대 쓰지 않는다.

export function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
    return toDateKey(new Date());
}

export function monthKeyOf(date: string): string {
    return date.slice(0, 7);
}

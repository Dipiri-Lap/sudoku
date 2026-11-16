// 오늘의 퍼즐 월별 등록부 + 날짜 유틸.
// i18n/locale.ts(해외판 공개 여부 판단)도 이 파일을 읽으므로 i18n 이나 React 를 import 하지 말 것.

/** 데일리로 낼 수 있는 게임. 라우트 id(=INTL_AVAILABLE_GAMES 의 값)와 같은 이름을 쓴다. */
export type DailyGameId = 'sudoku' | 'word-sort' | 'snapspot' | 'queens' | 'jigsaw';

interface DailyMonthEntry {
    /** 그 달의 게임. 해외판(/en, /ja)은 이 게임이 INTL_AVAILABLE_GAMES 에 있을 때만 데일리를 연다. */
    game: DailyGameId;
    load: () => Promise<{ default: unknown }>;
}

/**
 * 월 단위 청크로 나눠 두고 필요한 달만 불러온다.
 * 1년치를 static import 하면 초기 번들에 그대로 들어간다.
 * 달을 추가할 때 여기에 한 줄만 등록하면 된다(game 은 JSON 의 game 필드와 맞출 것. 필드가 없으면 sudoku).
 */
export const DAILY_MONTHS: Record<string, DailyMonthEntry> = {
    '2026-09': { game: 'sudoku', load: () => import('../../../data/daily/2026-09.json') },
    '2026-10': { game: 'sudoku', load: () => import('../../../data/daily/2026-10.json') },
    '2026-11': { game: 'word-sort', load: () => import('../../../data/daily/2026-11.json') },
};

/** 그 달의 데일리 게임. 문제 파일이 아직 없는 달이면 null. */
export function dailyGameOf(monthKey: string): DailyGameId | null {
    return DAILY_MONTHS[monthKey]?.game ?? null;
}

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────
// 데일리는 사용자 로컬 달력 날짜 기준이다(한국 사용자는 곧 한국 시간). toISOString() 은 UTC 라
// 한국 시간 오전 9시 이전에 어제 문제가 나온다 - 여기서는 절대 쓰지 않는다.
// 해외 사용자는 한국보다 늦거나 빠른 하루를 볼 수 있다(달 경계에서는 이전/다음 달 파일을 읽는다).

export function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 사용자 기기의 로컬 날짜 YYYY-MM-DD */
export function todayKey(): string {
    return toDateKey(new Date());
}

export function monthKeyOf(date: string): string {
    return date.slice(0, 7);
}

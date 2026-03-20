import sudokuChallenges from './sudoku-challenges.json';
import wordSortChallenges from './word-sort-challenges.json';

export type ChallengeType = 'STAGE' | 'TIME_ATTACK';

export type GameKey = 'sudoku' | 'word-sort';

export type ProgressSource = 'regular_stage' | 'beginner_stage' | 'time_attack' | 'word_sort_stage';

export interface ChallengeProgressConfig {
    source: ProgressSource;
    /** Number of stages (or 1 for binary) required to complete this challenge */
    target: number;
}

export interface ChallengeReward {
    puzzle_power: number;
    coin: number;
}

export interface Challenge {
    id: string;
    type: ChallengeType;
    game: GameKey;
    title: string;
    condition: string;
    progressConfig: ChallengeProgressConfig;
    reward: ChallengeReward;
}

export const SUDOKU_CHALLENGES: Challenge[] = sudokuChallenges as Challenge[];
export const WORD_SORT_CHALLENGES: Challenge[] = wordSortChallenges as Challenge[];

/** 게임별 도전과제 목록 — 게임 추가 시 여기에 등록 */
export const ALL_CHALLENGES: Record<GameKey, Challenge[]> = {
    sudoku: SUDOKU_CHALLENGES,
    'word-sort': WORD_SORT_CHALLENGES,
};

/** id → Challenge 빠른 조회 */
export const CHALLENGE_MAP: Record<string, Challenge> = Object.fromEntries(
    Object.values(ALL_CHALLENGES)
        .flat()
        .map((c) => [c.id, c])
);

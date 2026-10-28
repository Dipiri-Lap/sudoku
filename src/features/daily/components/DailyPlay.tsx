import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SudokuGame from '../../sudoku/components/SudokuGame';
import WordSortGame from '../../word-sort/components/WordSortGame';
import { WordSortProvider } from '../../word-sort/context/WordSortContext';
import { useDailyPuzzle } from '../../../context/DailyPuzzleContext';
import { getDailyPuzzle, isWordSortDaily, todayKey, type DailyPuzzle } from '../data/loader';

/**
 * /daily/play — 그날의 문제가 어떤 게임인지(game 필드)에 따라 화면을 고른다.
 * 스도쿠 달(game 없음)은 바깥의 SudokuProvider 를 그대로 쓰고, 워드스택 달은 자기 Provider 를 둘러서 연다.
 * 오늘 문제, 이미 푼 문제, 코인으로 해제한 문제만 열린다.
 */
const DailyPlay: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearedDates, unlockedDates } = useDailyPuzzle();
    const date = new URLSearchParams(location.search).get('date') || todayKey();
    const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);

    useEffect(() => {
        let cancelled = false;
        setPuzzle(null);
        getDailyPuzzle(date).then(p => {
            if (cancelled) return;
            if (!p) navigate('/daily', { replace: true });
            else setPuzzle(p);
        });
        return () => { cancelled = true; };
    }, [date, navigate]);

    if (!puzzle) return null;

    if (isWordSortDaily(puzzle)) {
        // 스도쿠 쪽과 같은 규칙 (개발 중에는 앞으로 올 날짜도 허용)
        const allowed = (import.meta.env.DEV && date >= todayKey()) || date === todayKey() || clearedDates.has(date) || unlockedDates.has(date);
        if (!allowed) {
            navigate('/daily', { replace: true });
            return null;
        }
        return (
            <WordSortProvider>
                <WordSortGame daily={{ date, level: puzzle.level }} />
            </WordSortProvider>
        );
    }

    return <SudokuGame />;
};

export default DailyPlay;

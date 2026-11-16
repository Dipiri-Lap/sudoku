import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SudokuGame from '../../sudoku/components/SudokuGame';
import WordSortGame from '../../word-sort/components/WordSortGame';
import { WordSortProvider } from '../../word-sort/context/WordSortContext';
import { useDailyPuzzle } from '../../../context/DailyPuzzleContext';
import { getDailyPuzzle, isWordSortDaily, todayKey, type DailyPuzzle } from '../data/loader';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { isDailyGameAvailable, isKo } from '../../../i18n/locale';

/**
 * /daily/play — 그날의 문제가 어떤 게임인지(game 필드)에 따라 화면을 고른다.
 * 스도쿠 달(game 없음)은 바깥의 SudokuProvider 를 그대로 쓰고, 워드스택 달은 자기 Provider 를 둘러서 연다.
 * 오늘 문제, 이미 푼 문제, 코인으로 해제한 문제만 열린다.
 */
const DailyPlay: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation('daily');
    const { clearedDates, unlockedDates } = useDailyPuzzle();
    const date = new URLSearchParams(location.search).get('date') || todayKey();
    const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);

    useEffect(() => {
        let cancelled = false;
        setPuzzle(null);
        getDailyPuzzle(date).then(p => {
            if (cancelled) return;
            // 문제가 없거나(파일이 아직 없는 달 포함), 해외판에서 열지 않는 게임(워드스택 등)의 날이면 캘린더로.
            if (!p || !isDailyGameAvailable(p.game)) navigate('/daily', { replace: true });
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

    return (
        <>
            {/* 해외판은 index.html 의 한국어 기본 제목이 남지 않게 덮는다(한국어판은 예전 그대로) */}
            {!isKo && <Helmet><title>{t('seo.title')}</title></Helmet>}
            <SudokuGame />
        </>
    );
};

export default DailyPlay;

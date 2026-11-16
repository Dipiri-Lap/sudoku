import React, { useEffect, useState } from 'react';
import { auth } from '../../../firebase';
import { getUserProfile, getGlobalBestTime } from '../../../services/rankingService';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/SudokuContext';
import { ChevronLeft, Trophy, Flame, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DIFFICULTIES = [/*'Easy', 'Medium', 'Hard',*/ 'Expert', /*'Master'*/] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const DIFFICULTY_LABEL_KEYS = {
    // Easy: 'easy',
    // Medium: 'medium',
    // Hard: 'hard',
    Expert: 'expert',
    // Master: 'master',
} as const satisfies Record<Difficulty, string>;

const DIFFICULTY_ICONS: Record<Difficulty, React.ReactNode> = {
    // Easy: <Smile size={40} />,
    // Medium: <Gauge size={40} />,
    // Hard: <Zap size={40} />,
    Expert: <Flame size={40} />,
    // Master: <Crown size={40} />,
};

const DifficultySelect: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation('sudoku');
    const { t: tc } = useTranslation('common');
    const { dispatch } = useGame();

    const [bestTimes, setBestTimes] = useState<Record<string, number>>({});
    const [globalBestTimes, setGlobalBestTimes] = useState<Record<string, { time: number, nickname: string }>>({});

    useEffect(() => {
        const fetchGlobalBestTimes = async () => {
            const times: Record<string, { time: number, nickname: string }> = {};
            for (const diff of DIFFICULTIES) {
                const result = await getGlobalBestTime(diff);
                if (result !== null) {
                    times[diff] = result;
                }
            }
            setGlobalBestTimes(times);
        };
        fetchGlobalBestTimes();

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    setBestTimes(profile.bestTimes || {});
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getBestTimeInfo = (diff: Difficulty) => {
        const personal = bestTimes[diff];
        const global = globalBestTimes[diff];

        return {
            personal: personal !== undefined ? formatTime(personal) : '--:--',
            global: global !== undefined ? `${formatTime(global.time)} (${global.nickname})` : '--:--'
        };
    };

    return (
        <div className="mode-select-page">
            <header className="mode-header">
                <button className="back-btn" onClick={() => navigate('/sudoku')}>
                    <ChevronLeft size={24} />
                </button>
                <h1>{t('difficulty.title')}</h1>
            </header>

            <div className="game-grid">
                {DIFFICULTIES.map((diff, index) => {
                    const times = getBestTimeInfo(diff);
                    return (
                        <div
                            key={diff}
                            className="game-card animate-fade-in"
                            data-difficulty={diff}
                            style={{ '--delay': `${index * 0.05 + 0.1}s` } as any}
                            onClick={() => {
                                dispatch({ type: 'START_GAME', difficulty: diff });
                                navigate(`/sudoku/time-attack/play?difficulty=${diff}`);
                            }}
                        >
                            <div className="game-card-icon">
                                {DIFFICULTY_ICONS[diff]}
                            </div>
                            <div className="game-card-content">
                                <h3 className="difficulty-name">{tc(`difficulty.${DIFFICULTY_LABEL_KEYS[diff]}`)}</h3>
                                <div className="game-card-footer" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%' }}>
                                    <span className="play-now" style={{ fontSize: '0.8rem' }}>
                                        <Trophy size={14} style={{ color: '#f1c40f' }} />
                                        {t('difficulty.myBest', { time: times.personal })}
                                    </span>
                                    <span className="play-now" style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                                        <Crown size={14} fill="currentColor" />
                                        {t('difficulty.worldBest', { time: times.global })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DifficultySelect;

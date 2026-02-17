import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { getUserProfile, getGlobalBestTime } from '../services/rankingService';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { ChevronLeft, Trophy, Zap, Flame, Crown, Smile, Gauge } from 'lucide-react';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    Easy: '쉬움',
    Medium: '보통',
    Hard: '어려움',
    Expert: '전문가',
    Master: '마스터',
};

const DIFFICULTY_ICONS: Record<Difficulty, React.ReactNode> = {
    Easy: <Smile size={40} />,
    Medium: <Gauge size={40} />,
    Hard: <Zap size={40} />,
    Expert: <Flame size={40} />,
    Master: <Crown size={40} />,
};

const DifficultySelect: React.FC = () => {
    const navigate = useNavigate();
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
                <h1>난이도 선택</h1>
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
                                <h3 className="difficulty-name">{DIFFICULTY_LABELS[diff]}</h3>
                                <div className="game-card-footer" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%' }}>
                                    <span className="play-now" style={{ fontSize: '0.8rem' }}>
                                        <Trophy size={14} style={{ color: '#f1c40f' }} />
                                        내 기록: {times.personal}
                                    </span>
                                    <span className="play-now" style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                                        <Crown size={14} fill="currentColor" />
                                        1위: {times.global}
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

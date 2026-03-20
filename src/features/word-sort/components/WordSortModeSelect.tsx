import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Layers } from 'lucide-react';
import { useWordSortProgress } from '../../../context/WordSortProgressContext';
import { useWordSort } from '../context/WordSortContext';
import levels from '../data/levels.json';

const WordSortModeSelect: React.FC = () => {
    const navigate = useNavigate();
    const { wordSortProgress, isSynced } = useWordSortProgress();
    const { dispatch } = useWordSort();

    const handlePlay = () => {
        if (!isSynced) return;
        const tutorialDone = localStorage.getItem('wordSort_tutorialDone');
        if (!tutorialDone) {
            // New user — game handles tutorial
            navigate('play');
            return;
        }
        const nextLevel = wordSortProgress + 1;
        const levelData = (levels as any[]).find((l) => l.id === nextLevel) || levels[0];
        dispatch({ type: 'START_LEVEL', levelData });
        navigate(`play?level=${nextLevel}`);
    };

    return (
        <div className="mode-select-page">
            <header className="mode-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={24} />
                </button>
                <h1>단어정렬 모드 선택</h1>
            </header>

            <div className="mode-grid">
                <div
                    className="game-card animate-fade-in"
                    style={{ '--delay': '0.1s' } as React.CSSProperties}
                    onClick={handlePlay}
                >
                    <div className="game-card-icon">
                        <Layers size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>스테이지 모드</h3>
                        <p>단어 카드를 같은 카테고리끼리 정렬해 스테이지를 클리어하세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                {!isSynced
                                    ? '로딩 중...'
                                    : wordSortProgress > 0
                                        ? `Level ${wordSortProgress + 1} 이어하기`
                                        : 'Level 1 시작하기'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WordSortModeSelect;

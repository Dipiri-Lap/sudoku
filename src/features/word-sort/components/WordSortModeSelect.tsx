import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Layers } from 'lucide-react';
import { useWordSortProgress } from '../../../context/WordSortProgressContext';

const WordSortModeSelect: React.FC = () => {
    const navigate = useNavigate();
    const { wordSortProgress } = useWordSortProgress();

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
                    onClick={() => navigate('/word-sort/play')}
                >
                    <div className="game-card-icon">
                        <Layers size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>스테이지 모드</h3>
                        <p>단어 카드를 같은 카테고리끼리 정렬해 스테이지를 클리어하세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                {wordSortProgress > 0
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

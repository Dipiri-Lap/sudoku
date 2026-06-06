import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Timer, Users, ChevronLeft, Heart } from 'lucide-react';

const SnapSpotModeSelect: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
    <Helmet>
      <title>스냅스팟 틀린그림찾기 - 퍼즐 가든</title>
      <meta name="description" content="두 사진을 비교해 다른 부분을 찾는 틀린그림찾기 게임. 노말·타임어택·PVP 모드로 즐기세요!" />
      <link rel="canonical" href="https://puzzles.tmhub.co.kr/snapspot" />
    </Helmet>
    <div className="mode-select-page">
      <header className="mode-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={24} />
        </button>
        <h1>스냅스팟</h1>
      </header>

      <div className="mode-grid">
        <div
          className="game-card animate-fade-in"
          style={{ '--delay': '0.1s' } as React.CSSProperties}
          onClick={() => navigate('/snapspot/normal')}
        >
          <div className="game-card-icon">
            <Heart size={40} />
          </div>
          <div className="game-card-content">
            <h3>스테이지</h3>
            <p>하트 3개로 도전! 3번 실수하면 게임 오버.</p>
            <div className="game-card-footer">
              <span className="play-now">플레이하기</span>
            </div>
          </div>
        </div>

        <div
          className="game-card animate-fade-in"
          style={{ '--delay': '0.2s', opacity: 0.6, cursor: 'default' } as React.CSSProperties}
        >
          <div className="game-card-icon">
            <Timer size={40} />
          </div>
          <div className="game-card-content">
            <h3>타임어택</h3>
            <p>제한 시간 안에 최대한 많은 차이점을 찾아내세요!</p>
            <div className="game-card-footer">
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>준비 중</span>
            </div>
          </div>
        </div>

        <div
          className="game-card animate-fade-in"
          style={{ '--delay': '0.3s', opacity: 0.6, cursor: 'default' } as React.CSSProperties}
        >
          <div className="game-card-icon">
            <Users size={40} />
          </div>
          <div className="game-card-content">
            <h3>PVP</h3>
            <p>두 플레이어가 실시간으로 대결하는 모드 (준비 중)</p>
            <div className="game-card-footer">
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>준비 중</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SnapSpotModeSelect;

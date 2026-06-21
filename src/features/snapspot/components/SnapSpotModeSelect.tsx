import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const btnStyle = (delay: string, clickable = true): React.CSSProperties => ({
  '--delay': delay,
  width: '100%',
  borderRadius: 16,
  objectFit: 'cover',
  cursor: clickable ? 'pointer' : 'default',
  display: 'block',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  transition: 'all 0.2s ease',
  opacity: clickable ? 1 : 0.6,
} as React.CSSProperties);

const hoverOn = (e: React.MouseEvent<HTMLImageElement>) => {
  e.currentTarget.style.transform = 'translateY(-4px)';
  e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.1)';
};
const hoverOff = (e: React.MouseEvent<HTMLImageElement>) => {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
};

const SnapSpotModeSelect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('landing-bg');
    return () => { document.body.classList.remove('landing-bg'); };
  }, []);

  return (
    <>
    <Helmet>
      <title>스냅스팟 틀린그림찾기 - 퍼즐 가든</title>
      <meta name="description" content="두 사진을 비교해 다른 부분을 찾는 틀린그림찾기 게임. 노말·타임어택·PVP 모드로 즐기세요!" />
      <link rel="canonical" href="https://puzzles.tmhub.co.kr/snapspot" />
    </Helmet>
    <div className="mode-select-bg"><div className="mode-select-page">
      <header className="mode-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={24} />
        </button>
        <h1>스냅스팟</h1>
      </header>

      <div className="mode-grid">
        <img
          src="/images/snapspot/stageBtn.webp"
          alt="스테이지"
          className="animate-fade-in"
          style={btnStyle('0.1s')}
          onClick={() => navigate('/snapspot/normal')}
          onMouseEnter={hoverOn}
          onMouseLeave={hoverOff}
        />

        <img
          src="/images/snapspot/arcadeBtn.webp"
          alt="아케이드"
          className="animate-fade-in"
          style={btnStyle('0.2s')}
          onClick={() => navigate('/snapspot/arcade')}
          onMouseEnter={hoverOn}
          onMouseLeave={hoverOff}
        />

        <img
          src="/images/snapspot/pvpBtn.webp"
          alt="PVP"
          className="animate-fade-in"
          style={btnStyle('0.3s', false)}
        />
      </div>
    </div></div>
    </>
  );
};

export default SnapSpotModeSelect;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const QueensModeSelect: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mode-select-page">
      <header className="mode-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={24} />
        </button>
        <h1>크라운 퀘스트</h1>
      </header>

      <div className="mode-grid">
        <div className="game-card" onClick={() => navigate('/queens/play')}>
          <div className="game-card-icon" style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}>
            <img src="/crownquest_logo.png" alt="크라운 퀘스트" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          </div>
          <div className="game-card-content">
            <h3>노말</h3>
            <p>스테이지를 순서대로 클리어하세요.</p>
          </div>
          <ChevronRight size={20} style={{ marginLeft: 'auto', color: '#94a3b8', flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
};

export default QueensModeSelect;

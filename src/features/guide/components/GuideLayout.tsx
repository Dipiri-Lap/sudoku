import React, { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { GUIDE_GAMES } from '../data/games';
import '../styles/guide.css';

/** 가이드 공통 틀 — 상단 메뉴(게임 전환)와 푸터 */
const GuideLayout: React.FC<{ color?: string; children: React.ReactNode }> = ({ color, children }) => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  // 전역 #root 의 500px 폭 제한(게임 화면용)을 이 페이지에서만 푼다.
  useEffect(() => {
    document.body.classList.add('guide-page');
    return () => { document.body.classList.remove('guide-page'); };
  }, []);
  return (
    <div className="gd" style={color ? ({ '--gd-c': color } as React.CSSProperties) : undefined}>
      <header className="gd-nav">
        <div className="gd-nav-in">
          <Link to="/" className="gd-logo">🧩 퍼즐 가든</Link>
          <nav className="gd-menu" aria-label="게임 설명 메뉴">
            <NavLink to="/guide" end className={({ isActive }) => (isActive ? 'on' : '')}>전체</NavLink>
            {GUIDE_GAMES.map(g => (
              <NavLink key={g.id} to={`/guide/${g.id}`} className={({ isActive }) => (isActive ? 'on' : '')}>{g.name}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      {children}
      <footer className="gd-foot">
        <Link to="/">퍼즐 가든 홈</Link> · 모든 게임 무료, 설치 없이 바로 플레이
      </footer>
    </div>
  );
};

export default GuideLayout;

import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GUIDE_GAMES } from '../data/games';
import GuideLayout from './GuideLayout';

const GuideIndex: React.FC = () => (
  <GuideLayout>
    <Helmet>
      <title>게임 설명 - 퍼즐 가든 모든 게임 하는 법 | 퍼즐 가든</title>
      <meta name="description" content="워드스택, 스냅스팟, Tiny Pieces, 크라운 퀘스트, 스도쿠, 애로우웨이, 크로썸까지 퍼즐 가든 모든 게임의 규칙과 공략을 자세히 알려드려요." />
      <link rel="canonical" href="https://puzzles.tmhub.co.kr/guide" />
    </Helmet>
    <div className="gd-wrap">
      <section className="gd-hero">
        <h1>어떤 퍼즐부터<br />시작해 볼까요?</h1>
        <p>규칙, 조작법, 모드, 도구, 공략 팁까지. 게임마다 자세히 설명해 드려요.</p>
      </section>
      <div className="gd-grid">
        {GUIDE_GAMES.map(g => (
          <Link key={g.id} to={`/guide/${g.id}`} className="gd-card" style={{ '--gd-c': g.color } as React.CSSProperties}>
            <img src={g.image} alt={g.name} loading="lazy" />
            <div className="gd-card-b">
              <h2>{g.name}</h2>
              <p>{g.tagline}</p>
              <div className="gd-tags">{g.tags.map(t => <span key={t} className="gd-tag">{t}</span>)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </GuideLayout>
);

export default GuideIndex;

import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GUIDE_GAMES, getGuideGame } from '../data/games';
import GuideLayout from './GuideLayout';

const GuideDetail: React.FC = () => {
  const { gameId } = useParams();
  const game = getGuideGame(gameId);
  if (!game) return <Navigate to="/guide" replace />;

  const idx = GUIDE_GAMES.indexOf(game);
  const prev = GUIDE_GAMES[(idx - 1 + GUIDE_GAMES.length) % GUIDE_GAMES.length];
  const next = GUIDE_GAMES[(idx + 1) % GUIDE_GAMES.length];
  const url = `https://puzzles.tmhub.co.kr/guide/${game.id}`;
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: game.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <GuideLayout color={game.color}>
      <Helmet>
        <title>{`${game.name} 하는 법 - 규칙·공략 총정리 | 퍼즐 가든`}</title>
        <meta name="description" content={`${game.name}: ${game.tagline}. 규칙, 조작법, 모드, 도구, 공략 팁을 자세히 설명합니다.`} />
        <link rel="canonical" href={url} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <section className="gd-dhero">
        <div className="gd-wrap gd-dhero-in">
          <div>
            <div className="gd-crumb"><Link to="/guide">게임 설명</Link> › {game.name}</div>
            <img className="gd-dhero-logo" src={game.image} alt="" />
            <h1>{game.name}</h1>
            <p>{game.tagline}</p>
            <a className="gd-btn" href={game.playPath}>지금 플레이하기</a>
          </div>
          <div className="gd-phone gd-phone-hero">
            <img src={game.hero ?? game.image} alt={`${game.name} 플레이 화면`} />
          </div>
        </div>
        <div className="gd-wrap">
          <div className="gd-facts">
            {game.facts.map(f => (
              <div key={f.k} className="gd-fact"><b>{f.k}</b><span>{f.v}</span></div>
            ))}
          </div>
        </div>
      </section>

      <div className="gd-wrap">
        <div style={{ padding: '.5rem 0' }}>
          {game.sections.map((s, i) => {
            const shots = s.shots ?? [];
            const cls = ['gd-sec', shots.length ? '' : 'gd-sec-solo', i % 2 ? 'gd-sec-rev' : ''].filter(Boolean).join(' ');
            return (
              <section key={s.title} className={cls}>
                <div className="gd-sec-text">
                  <div className="gd-label">{s.label}</div>
                  <h2>{s.title}</h2>
                  {s.body.map((p, j) => <p key={j}>{p}</p>)}
                  {s.bullets && <ul>{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>}
                </div>
                {shots.length > 0 && (
                  <div className={`gd-shots gd-shots-${shots.length}`}>
                    {shots.map(sh => (
                      <figure key={sh.src} className="gd-shot">
                        <div className="gd-phone"><img src={sh.src} alt={sh.caption} loading="lazy" /></div>
                        <figcaption>{sh.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="gd-box">
          <h2>💡 공략 팁</h2>
          <ol className="gd-tips">{game.tips.map(t => <li key={t}>{t}</li>)}</ol>
        </section>

        <section className="gd-box gd-faq">
          <h2>자주 묻는 질문</h2>
          {game.faq.map(f => (
            <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </section>

        <section className="gd-cta">
          <h2>{game.name}, 이제 직접 해볼까요?</h2>
          <a className="gd-btn" href={game.playPath}>무료로 플레이하기</a>
        </section>

        <div className="gd-pn">
          <Link to={`/guide/${prev.id}`}><small>← 이전 게임</small>{prev.name}</Link>
          <Link to={`/guide/${next.id}`}><small>다음 게임 →</small>{next.name}</Link>
        </div>
      </div>
    </GuideLayout>
  );
};

export default GuideDetail;

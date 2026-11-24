import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { localeHref } from '../../../i18n/locale';
import { useSnapSpotProgress } from '../../../context/SnapSpotProgressContext';

const IS_DEV = import.meta.env.DEV;
const MAX_STAGE = 955;

// ── Mini visuals ───────────────────────────────────────────────────────────────

function MiniCompare() {
  const { t } = useTranslation('snapspot');
  return (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      {(['#6366f1', '#f59e0b'] as const).map((accent, si) => (
        <div key={si} style={{
          width: 76, height: 76, borderRadius: 10,
          background: '#e2e8f0', position: 'relative', overflow: 'hidden',
          border: '2px solid #cbd5e1',
        }}>
          {/* 간단한 풍경 도형들 */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: '#86efac', borderRadius: '0 0 8px 8px' }} />
          <div style={{ position: 'absolute', bottom: 24, left: 10, width: 18, height: 30, background: '#4ade80', borderRadius: '50% 50% 0 0' }} />
          <div style={{ position: 'absolute', top: 12, right: 14, width: 22, height: 22, borderRadius: '50%', background: '#fcd34d' }} />
          {/* si===1 이면 차이점: 원 색상이 다름 */}
          {si === 1 && (
            <div style={{ position: 'absolute', top: 12, right: 14, width: 22, height: 22, borderRadius: '50%', background: '#f87171' }} />
          )}
          {/* 차이점 하이라이트 링 (오른쪽 이미지에만) */}
          {si === 1 && (
            <div style={{
              position: 'absolute', top: 8, right: 10, width: 30, height: 30,
              borderRadius: '50%', border: '2.5px solid #ef4444',
              boxSizing: 'border-box',
            }} />
          )}
          <div style={{
            position: 'absolute', bottom: 2, left: 0, right: 0,
            textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#475569',
          }}>
            {si === 0 ? t('modeSelect.miniOriginal') : t('modeSelect.miniModified')}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniTap() {
  return (
    <div style={{
      width: 76, height: 76, borderRadius: 10,
      background: '#e2e8f0', position: 'relative', overflow: 'hidden',
      border: '2px solid #cbd5e1', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: '#86efac' }} />
      <div style={{ position: 'absolute', bottom: 24, left: 10, width: 18, height: 30, background: '#4ade80', borderRadius: '50% 50% 0 0' }} />
      {/* 탭 완료 마커 */}
      <div style={{
        position: 'absolute', top: 10, right: 12,
        width: 26, height: 26, borderRadius: '50%',
        background: '#22c55e', border: '2.5px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: '#fff', fontWeight: 900,
      }}>✓</div>
      {/* 손가락 커서 */}
      <div style={{
        position: 'absolute', bottom: 18, right: 6,
        fontSize: 20, transform: 'rotate(-20deg)',
      }}>👆</div>
    </div>
  );
}

function MiniZoom() {
  return (
    <div style={{
      width: 76, height: 76, borderRadius: 10,
      background: '#e2e8f0', position: 'relative', overflow: 'hidden',
      border: '2px solid #cbd5e1', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: '#86efac' }} />
      {/* 확대된 원 영역 */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #6366f1',
        background: 'rgba(99,102,241,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>🔍</div>
      <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, fontWeight: 800, color: '#6366f1' }}>×3</div>
    </div>
  );
}

function MiniHeart() {
  const { t } = useTranslation('snapspot');
  return (
    <div style={{
      width: 76, height: 76, borderRadius: 10,
      background: '#1e293b', position: 'relative', overflow: 'hidden',
      border: '2px solid #334155', flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <span style={{ fontSize: 18, filter: 'grayscale(1) opacity(0.3)' }}>❤️</span>
        <span style={{ fontSize: 18, filter: 'grayscale(1) opacity(0.3)' }}>❤️</span>
        <span style={{ fontSize: 18 }}>❤️</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{t('modeSelect.miniHeartLeft')}</div>
    </div>
  );
}

const TIPS = [
  { key: 'compare', visual: <MiniCompare /> },
  { key: 'tap', visual: <MiniTap /> },
  { key: 'zoom', visual: <MiniZoom /> },
  { key: 'stage', visual: <MiniHeart /> },
] as const;

// ── Component ──────────────────────────────────────────────────────────────────

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
  const { t } = useTranslation('snapspot');
  const { t: tc } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [devStage, setDevStage] = useState('');
  const { snapSpotProgress, isSynced } = useSnapSpotProgress();

  const handleDevStageGo = () => {
    const n = parseInt(devStage, 10);
    if (n >= 1) navigate(`/snapspot/normal?stage=${n}`);
  };

  useEffect(() => {
    document.body.classList.add('landing-bg');
    return () => { document.body.classList.remove('landing-bg'); };
  }, []);

  return (
    <>
      <Helmet>
        <title>{t('modeSelect.seoTitle')}</title>
        <meta name="description" content={t('modeSelect.seoDescription')} />
        <link rel="canonical" href={`https://puzzles.tmhub.co.kr${localeHref('/snapspot')}`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: tc('brand'), item: `https://puzzles.tmhub.co.kr${localeHref('/')}` },
            { '@type': 'ListItem', position: 2, name: tc('games.snapspot.name'), item: `https://puzzles.tmhub.co.kr${localeHref('/snapspot')}` },
          ],
        })}</script>
      </Helmet>
      <div className="mode-select-page">
        <header className="mode-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={24} />
          </button>
          <h1>{tc('games.snapspot.name')}</h1>
        </header>

        <div className="mode-grid">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <img
              src="/images/snapspot/stageBtn.webp"
              alt={t('modeSelect.stageAlt')}
              className="animate-fade-in"
              style={btnStyle('0.1s', isSynced)}
              onClick={() => { if (isSynced) navigate('/snapspot/normal'); }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            />
            <span style={{ fontSize: '0.88rem', color: '#fda085', fontWeight: 700 }}>
              {!isSynced ? t('modeSelect.loading') : snapSpotProgress > 0 ? t('modeSelect.continueStage', { n: snapSpotProgress + 1, max: MAX_STAGE }) : t('modeSelect.startStage', { max: MAX_STAGE })}
            </span>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <img
              src="/images/snapspot/arcadeBtn.webp"
              alt={t('modeSelect.arcadeAlt')}
              className="animate-fade-in"
              style={{ ...btnStyle('0.2s', false), filter: 'grayscale(1)', opacity: 0.55 }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 16,
            }}>
              <span style={{
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em',
                padding: '5px 14px', borderRadius: '999px',
              }}>Coming Soon</span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <img
              src="/images/snapspot/pvpBtn.webp"
              alt="PVP"
              className="animate-fade-in"
              style={{ ...btnStyle('0.3s', false), filter: 'grayscale(1)', opacity: 0.55 }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 16,
            }}>
              <span style={{
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em',
                padding: '5px 14px', borderRadius: '999px',
              }}>Coming Soon</span>
            </div>
          </div>
        </div>

        {/* DEV: 스테이지 직접 입력 */}
        {IS_DEV && (
          <div style={{ padding: '0 1.5rem 1rem', maxWidth: '480px', margin: '0 auto', display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              min={1}
              placeholder="스테이지 번호"
              value={devStage}
              onChange={e => setDevStage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDevStageGo()}
              style={{
                flex: 1, padding: '0.5rem 0.75rem', borderRadius: '10px',
                border: '1.5px solid #f97316', background: '#fff7ed',
                fontSize: '0.9rem', fontWeight: 700, outline: 'none',
              }}
            />
            <button
              onClick={handleDevStageGo}
              style={{
                padding: '0.5rem 1rem', borderRadius: '10px', border: 'none',
                background: '#f97316', color: '#fff', fontWeight: 800,
                fontSize: '0.9rem', cursor: 'pointer',
              }}
            >GO</button>
          </div>
        )}

        {/* 게임 안내 */}
        <details
          style={{ padding: '0.5rem 1.5rem 3rem', maxWidth: '480px', margin: '0 auto', color: '#555', lineHeight: '1.8' }}
          onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary style={{
            fontSize: '1.1rem', fontWeight: 700, color: '#444',
            cursor: 'pointer', listStyle: 'none',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            userSelect: 'none',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#888', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
            {t('modeSelect.aboutTitle')}
          </summary>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.7, padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '12px', borderLeft: '3px solid #94a3b8' }}>
              <Trans t={t} i18nKey="modeSelect.aboutBody" />
            </p>
            {TIPS.map(tip => (
              <div key={tip.key} style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
              }}>
                <div style={{ flexShrink: 0 }}>{tip.visual}</div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    {t(`modeSelect.tips.${tip.key}.label`)}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.3rem' }}>
                    {t(`modeSelect.tips.${tip.key}.title`)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    {t(`modeSelect.tips.${tip.key}.desc`)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </>
  );
};

export default SnapSpotModeSelect;

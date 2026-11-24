import React, { useEffect, useState } from 'react';
import ScaledStage from './ScaledStage';

/**
 * 타이틀: 로고 + 불러오기 막대 → "탭해서 시작".
 * 로비·판에 쓰는 그림을 미리 받아 둔다(첫 판에서 그림이 늦게 뜨지 않게).
 * 다 받기 전에 눌러도 들어간다 - 기다리게 하지 않는다.
 */
const PRELOAD = [
  '/assets/3match/ui/bg-garden.webp',
  '/assets/3match/ui/plaque.webp',
  '/assets/3match/ui/sign.webp',
  '/assets/3match/ui/disc.webp',
  '/assets/3match/ui/soil.webp',
  '/assets/3match/ui/frame.webp',
  '/assets/3match/chars/hedgehog.png',
  ...[0, 1, 2, 3, 4, 5].map(i => `/assets/3match/gems/gem-${i}.png`),
  '/assets/3match/items/rocket.png',
  '/assets/3match/items/tnt.png',
  '/assets/3match/items/propeller.png',
  '/assets/3match/items/lightball.png',
];

/** 로고 둘레에 떠다니는 채소 */
const FLOATERS = [0, 2, 4, 1, 5, 3];

const TitleScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const [loaded, setLoaded] = useState(0);
  const done = loaded >= PRELOAD.length;

  useEffect(() => {
    let alive = true;
    PRELOAD.forEach(src => {
      const img = new Image();
      img.onload = img.onerror = () => alive && setLoaded(n => n + 1);
      img.src = src;
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ScaledStage className="pg-title" onClick={onStart} role="button" aria-label="탭해서 시작">
      <div className="pg-title-floaters" aria-hidden>
        {FLOATERS.map((c, i) => (
          <img key={i} src={`/assets/3match/gems/gem-${c}.png`} alt="" style={{ ['--i' as string]: i, ['--row' as string]: i % 2 }} />
        ))}
      </div>

      <div className="pg-logo">
        <span className="pg-logo-pop">Pop</span>
        <span className="pg-logo-garden">Garden</span>
      </div>
      <img className="pg-title-char" src="/assets/3match/chars/hedgehog.png" alt="" draggable={false} />

      <div className="pg-title-foot">
        {done ? (
          <p className="pg-tap">탭해서 시작</p>
        ) : (
          <div className="pg-loadbar" aria-label="불러오는 중">
            <i style={{ width: `${(loaded / PRELOAD.length) * 100}%` }} />
          </div>
        )}
        <small className="pg-version">v0.1</small>
      </div>
    </ScaledStage>
  );
};

export default TitleScreen;

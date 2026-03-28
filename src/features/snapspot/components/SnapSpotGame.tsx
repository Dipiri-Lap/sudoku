import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/SnapSpotGame.css';

// Unity Canvas RectTransform: Width=1020, Height=770, Pivot=0.5/0.5, Pos=0/0
const IMG_DISPLAY_W = 1020;
const IMG_DISPLAY_H = 770;
const HALF_W = IMG_DISPLAY_W / 2;
const HALF_H = IMG_DISPLAY_H / 2;
const MAX_ZOOM = 3;
const TAP_THRESHOLD = 8; // px — below this is a tap, above is a drag

interface Difference {
  topPosition: { x: number; y: number };
  bottomPosition: { x: number; y: number };
  colSize: { x: number; y: number };
}

interface LevelData {
  imageID: number;
  differences: Difference[];
}

interface WrongFlash {
  x: number;
  y: number;
  side: 'orig' | 'mod';
}

// Unity Canvas local pos (center-origin, y-up) → CSS % of displayed image
function toPercent(pos: { x: number; y: number }, size: { x: number; y: number }) {
  return {
    left: (pos.x + HALF_W) / IMG_DISPLAY_W * 100,
    top: (HALF_H - pos.y) / IMG_DISPLAY_H * 100,
    width: size.x / IMG_DISPLAY_W * 100,
    height: size.y / IMG_DISPLAY_H * 100,
  };
}

const IS_DEV = import.meta.env.DEV;

const SnapSpotGame: React.FC = () => {
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [found, setFound] = useState<boolean[]>([]);
  const [wrongFlash, setWrongFlash] = useState<WrongFlash | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Zoom / pan state (shared between both images)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  // Refs for latest values inside event callbacks
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // Container ref for pan bounds
  const wrapRef = useRef<HTMLDivElement>(null);
  // Ref for the whole game container — non-passive wheel listener attached here
  const gameRef = useRef<HTMLDivElement>(null);

  // Interaction tracking ref (touch/mouse state)
  const ia = useRef({
    type: 'none' as 'none' | 'pan' | 'pinch',
    start: { x: 0, y: 0 },
    panOrigin: { x: 0, y: 0 },
    pinchDist: 0,
    pinchZoom: 1,
    moved: false,
  });

  // Prevent ghost click after touch
  const lastTouchEnd = useRef(0);

  // Mouse drag state
  const mouseDrag = useRef({ down: false, start: { x: 0, y: 0 }, panOrigin: { x: 0, y: 0 }, moved: false });

  // Lock body scroll while game is mounted (same pattern as WordSortGame)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    fetch('/images/snapspot/1.json')
      .then((r) => r.json())
      .then((data: LevelData) => {
        setLevelData(data);
        setFound(new Array(data.differences.length).fill(false));
      });
  }, []);

  const clampPan = useCallback((x: number, y: number, z: number) => {
    if (z <= 1 || !wrapRef.current) return { x: 0, y: 0 };
    const { width, height } = wrapRef.current.getBoundingClientRect();
    const maxX = (width * (z - 1)) / 2;
    const maxY = (height * (z - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // Hit detection — accounts for current zoom/pan transform
  const processHit = useCallback(
    (clientX: number, clientY: number, rect: DOMRect, side: 'orig' | 'mod') => {
      if (!levelData || isWinner) return;

      const z = zoomRef.current;
      const p = panRef.current;
      const W = rect.width;
      const H = rect.height;

      // Inverse of CSS: translate(p.x, p.y) scale(z), transform-origin: center
      const origX = (clientX - rect.left - W / 2 - p.x) / z + W / 2;
      const origY = (clientY - rect.top - H / 2 - p.y) / z + H / 2;
      const canvasX = (origX / W) * IMG_DISPLAY_W - HALF_W;
      const canvasY = HALF_H - (origY / H) * IMG_DISPLAY_H;

      for (let i = 0; i < levelData.differences.length; i++) {
        if (found[i]) continue;
        const diff = levelData.differences[i];
        const pos = side === 'orig' ? diff.topPosition : diff.bottomPosition;
        if (
          Math.abs(canvasX - pos.x) <= diff.colSize.x / 2 &&
          Math.abs(canvasY - pos.y) <= diff.colSize.y / 2
        ) {
          const next = [...found];
          next[i] = true;
          setFound(next);
          if (next.every(Boolean)) setIsWinner(true);
          return;
        }
      }

      if (IS_DEV) {
        console.log(`[SnapSpot] miss → canvas x=${canvasX.toFixed(1)}, y=${canvasY.toFixed(1)}`);
      }
      setWrongFlash({ x: clientX - rect.left, y: clientY - rect.top, side });
      setTimeout(() => setWrongFlash(null), 600);
    },
    [levelData, found, isWinner],
  );

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      setIsInteracting(true);
      ia.current.moved = false;

      if (e.touches.length === 1) {
        ia.current.type = 'pan';
        ia.current.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        ia.current.panOrigin = { ...panRef.current };
      } else if (e.touches.length === 2) {
        ia.current.type = 'pinch';
        ia.current.moved = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        ia.current.pinchDist = Math.hypot(dx, dy);
        ia.current.pinchZoom = zoomRef.current;
      }
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2) {
        ia.current.type = 'pinch';
        ia.current.moved = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        if (ia.current.pinchDist < 1) return;
        const newZoom = Math.max(1, Math.min(MAX_ZOOM, zoomRef.current * (newDist / ia.current.pinchDist)));
        ia.current.pinchDist = newDist; // update each frame for incremental calc

        if (newZoom <= 1) {
          setZoom(1);
          zoomRef.current = 1;
          setPan({ x: 0, y: 0 });
          panRef.current = { x: 0, y: 0 };
        } else {
          // Focal point = midpoint of two fingers
          const rect = e.currentTarget.getBoundingClientRect();
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const focalX = midX - rect.left - rect.width / 2;
          const focalY = midY - rect.top - rect.height / 2;
          const p = panRef.current;
          const ratio = newZoom / zoomRef.current;
          const newPan = clampPan(focalX + (p.x - focalX) * ratio, focalY + (p.y - focalY) * ratio, newZoom);
          setZoom(newZoom);
          zoomRef.current = newZoom;
          setPan(newPan);
          panRef.current = newPan;
        }
      } else if (e.touches.length === 1 && ia.current.type === 'pan') {
        const dx = e.touches[0].clientX - ia.current.start.x;
        const dy = e.touches[0].clientY - ia.current.start.y;
        if (Math.hypot(dx, dy) > TAP_THRESHOLD) ia.current.moved = true;
        if (ia.current.moved && zoomRef.current > 1) {
          setPan(clampPan(ia.current.panOrigin.x + dx, ia.current.panOrigin.y + dy, zoomRef.current));
        }
      }
    },
    [clampPan],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>, side: 'orig' | 'mod') => {
      if (e.touches.length === 0) {
        setIsInteracting(false);
        ia.current.type = 'none';
        // Clamp pan after pinch ends
        setPan((p) => clampPan(p.x, p.y, zoomRef.current));
      }
      // Tap = no movement, all fingers lifted
      if (!ia.current.moved && e.changedTouches.length === 1 && e.touches.length === 0) {
        lastTouchEnd.current = Date.now();
        const t = e.changedTouches[0];
        processHit(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect(), side);
      }
    },
    [clampPan, processHit],
  );

  // ── Mouse wheel: zoom + block page scroll (non-passive, runs after render) ───
  useEffect(() => {
    const el = gameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      const newZoom = Math.max(1, Math.min(MAX_ZOOM, zoomRef.current + delta));
      if (newZoom === zoomRef.current) return;

      // Focal point: cursor position relative to the image wrap under the cursor
      let focalX = 0, focalY = 0;
      const wraps = (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLDivElement>('.snapspot-image-wrap');
      for (const wrap of wraps) {
        const r = wrap.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          focalX = e.clientX - r.left - r.width / 2;
          focalY = e.clientY - r.top - r.height / 2;
          break;
        }
      }

      if (newZoom <= 1) {
        setZoom(1);
        zoomRef.current = 1;
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
      } else {
        const p = panRef.current;
        const ratio = newZoom / zoomRef.current;
        const newPan = clampPan(focalX + (p.x - focalX) * ratio, focalY + (p.y - focalY) * ratio, newZoom);
        setZoom(newZoom);
        zoomRef.current = newZoom;
        setPan(newPan);
        panRef.current = newPan;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }); // no deps — re-attaches after every render so gameRef is always valid

  // ── Mouse drag + click (desktop) ────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    mouseDrag.current = { down: true, start: { x: e.clientX, y: e.clientY }, panOrigin: { ...panRef.current }, moved: false };
    setIsInteracting(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const md = mouseDrag.current;
    if (!md.down || zoomRef.current <= 1) return;
    const dx = e.clientX - md.start.x;
    const dy = e.clientY - md.start.y;
    if (Math.hypot(dx, dy) > TAP_THRESHOLD) md.moved = true;
    if (md.moved) {
      const newPan = clampPan(md.panOrigin.x + dx, md.panOrigin.y + dy, zoomRef.current);
      setPan(newPan);
      panRef.current = newPan;
    }
  }, [clampPan]);

  const handleMouseUp = useCallback(() => {
    mouseDrag.current.down = false;
    setIsInteracting(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, side: 'orig' | 'mod') => {
      if (Date.now() - lastTouchEnd.current < 350) return; // ghost click guard
      if (mouseDrag.current.moved) return; // was a drag, not a click
      processHit(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), side);
    },
    [processHit],
  );

  // ── Zoom buttons ────────────────────────────────────────────────────────────
  const adjustZoom = useCallback(
    (delta: number) => {
      const newZoom = Math.max(1, Math.min(MAX_ZOOM, zoomRef.current + delta));
      setZoom(newZoom);
      if (newZoom <= 1) setPan({ x: 0, y: 0 });
      else setPan((p) => clampPan(p.x, p.y, newZoom));
    },
    [clampPan],
  );

  if (!levelData) return <div className="snapspot-loading">로딩 중...</div>;

  const { imageID, differences } = levelData;
  const foundCount = found.filter(Boolean).length;

  const innerStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
    transition: isInteracting ? 'none' : 'transform 0.2s ease',
  };

  return (
    <>
    <Helmet>
      <title>스냅스팟 틀린그림찾기 - 퍼즐 가든</title>
      <meta name="description" content="두 사진을 비교해서 다른 부분을 찾는 틀린그림찾기 게임. 눈썰미를 테스트해보세요!" />
      <link rel="canonical" href="https://puzzles.tmhub.co.kr/snapspot" />
    </Helmet>
    <div className="snapspot-game" ref={gameRef}>
      <div className="snapspot-header">
        <h2 className="snapspot-title">틀린 그림 찾기</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {IS_DEV && (
            <button
              onClick={() => setShowDebug((v) => !v)}
              style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px',
                border: '1px solid #f59e0b',
                background: showDebug ? '#f59e0b' : 'transparent',
                color: showDebug ? '#000' : '#f59e0b', cursor: 'pointer',
              }}
            >
              DEBUG
            </button>
          )}
          <button
            className="snapspot-zoom-btn"
            onClick={() => adjustZoom(-0.5)}
            disabled={zoom <= 1}
          >−</button>
          <span className="snapspot-zoom-label">{zoom.toFixed(1)}×</span>
          <button
            className="snapspot-zoom-btn"
            onClick={() => adjustZoom(0.5)}
            disabled={zoom >= MAX_ZOOM}
          >+</button>
          <span className="snapspot-progress">{foundCount} / {differences.length}</span>
        </div>
      </div>

      <div className="snapspot-images">
        {(['orig', 'mod'] as const).map((side) => (
          <div
            key={side}
            ref={side === 'orig' ? wrapRef : undefined}
            className={`snapspot-image-wrap${zoom > 1 ? ' is-zoomed' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={(e) => handleTouchEnd(e, side)}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => handleClick(e, side)}
          >
            {/* Inner div carries the zoom/pan transform */}
            <div style={innerStyle}>
              <img
                src={`/images/snapspot/${imageID}${side === 'mod' ? '_1' : ''}.jpg`}
                alt={side === 'orig' ? '원본' : '변경본'}
                draggable={false}
              />

              {/* Found markers */}
              {differences.map((diff, i) => {
                if (!found[i]) return null;
                const pos = side === 'orig' ? diff.topPosition : diff.bottomPosition;
                const { left, top, width, height } = toPercent(pos, diff.colSize);
                return (
                  <div
                    key={i}
                    className="snapspot-found-marker"
                    style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                  />
                );
              })}

              {/* Debug hit zones */}
              {IS_DEV && showDebug && differences.map((diff, i) => {
                const pos = side === 'orig' ? diff.topPosition : diff.bottomPosition;
                const { left, top, width, height } = toPercent(pos, diff.colSize);
                return (
                  <div
                    key={`dbg-${i}`}
                    style={{
                      position: 'absolute',
                      left: `${left}%`, top: `${top}%`,
                      width: `${width}%`, height: `${height}%`,
                      transform: 'translate(-50%, -50%)',
                      border: '2px dashed #f59e0b',
                      background: 'rgba(245,158,11,0.2)',
                      borderRadius: '4px',
                      pointerEvents: 'none', zIndex: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>{i}</span>
                  </div>
                );
              })}
            </div>

            {/* Wrong flash stays in screen space (outside transform) */}
            {wrongFlash?.side === side && (
              <div
                className="snapspot-wrong-flash"
                style={{ left: wrongFlash.x, top: wrongFlash.y }}
              />
            )}
          </div>
        ))}
      </div>

      {isWinner && (
        <div className="snapspot-win-overlay">
          <div className="snapspot-win-card">
            <div className="snapspot-win-emoji">🎉</div>
            <h2>모두 찾았어요!</h2>
            <p>{differences.length}개 차이점을 모두 발견했습니다.</p>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default SnapSpotGame;

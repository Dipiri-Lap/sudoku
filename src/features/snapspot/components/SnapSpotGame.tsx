import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Search, Check, Palette, Settings } from 'lucide-react';
import { useSnapSpotMarker, getMarkerContent } from '../context/SnapSpotMarkerContext';
import SnapSpotMarkerShopModal from './SnapSpotMarkerShopModal';
import SnapSpotSettingsModal from './SnapSpotSettingsModal';
import { useCoins } from '../../../context/CoinContext';
import { useSnapSpotProgress } from '../../../context/SnapSpotProgressContext';
import { auth } from '../../../firebase';
import '../styles/SnapSpotGame.css';

export type SnapSpotMode = 'normal' | 'time-attack' | 'stage' | 'arcade';

const MAX_HEARTS = 3;
const ARCADE_CDN_BASE = 'https://images.tmhub.co.kr/spot-the-difference/arcade';
const ARCADE_TOTAL = 150;
const ARCADE_INITIAL_TIME = 60;
const ARCADE_BONUS_TIME = 5;
const ARCADE_MIN_WAIT = 1000; // 스테이지 모드보다 짧게

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
const CDN_BASE = 'https://images.tmhub.co.kr/spot-the-difference/stages/0001-0500';


const EXCLAMATIONS = ['NICE!', 'GOOD!', 'GREAT!', 'AWESOME!', 'PERFECT!', 'AMAZING!', 'EXCELLENT!', 'BRILLIANT!', 'SUPERB!', 'SPOT ON!'];
const PARTICLE_COLORS = ['#fbbf24', '#22c55e', '#6366f1', '#f472b6', '#fb923c', '#38bdf8', '#a3e635'];
const PARTICLE_DIRS = [
  [-38, -48], [38, -48], [-52,  0], [52,  0],
  [-38,  42], [38,  42], [  0, -58], [ 0,  50],
];

interface Props {
  mode: SnapSpotMode;
}

const SnapSpotGame: React.FC<Props> = ({ mode }) => {
  const navigate = useNavigate();
  const { addCoins, spendCoins, coins } = useCoins();
  const { snapSpotProgress, saveSnapSpotProgress: saveProgress } = useSnapSpotProgress();
  const { selectedMarkerId } = useSnapSpotMarker();
  const [showMarkerShop, setShowMarkerShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(() => parseFloat(localStorage.getItem('snapspot_bgmVolume') ?? '0.3'));
  const [sfxVolume, setSfxVolume] = useState(() => parseFloat(localStorage.getItem('snapspot_sfxVolume') ?? '1'));
  const sfxVolumeRef = useRef(sfxVolume);
  const hasAwardedCoins = useRef(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const correctSfxRef = useRef<HTMLAudioElement | null>(null);
  const wrongSfxRef = useRef<HTMLAudioElement | null>(null);
  const clearSfxRef = useRef<HTMLAudioElement | null>(null);
  const failSfxRef = useRef<HTMLAudioElement | null>(null);
  const btnSfxRef = useRef<HTMLAudioElement | null>(null);
  const prefetchCache = useRef<Record<number, LevelData>>({});
  const arcadeQueue = useRef<number[]>(
    mode === 'arcade' ? shuffleArray(Array.from({ length: ARCADE_TOTAL }, (_, i) => i + 1)) : []
  );
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [found, setFound] = useState<boolean[]>([]);
  const [wrongFlash, setWrongFlash] = useState<WrongFlash | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [hearts, setHearts] = useState(mode === 'stage' ? MAX_HEARTS : 0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [heartShake, setHeartShake] = useState(false);
  const [stageId, setStageId] = useState(() => {
    if (mode === 'stage') return Math.max(1, snapSpotProgress + 1);
    if (mode === 'arcade') return arcadeQueue.current.pop()!;
    return 1;
  });
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [imgsLoaded, setImgsLoaded] = useState({ orig: false, mod: false });
  const [minWaitDone, setMinWaitDone] = useState(false);
  const [stageNotFound, setStageNotFound] = useState(false);
  const [lastFoundIdx, setLastFoundIdx] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [arcadeTime, setArcadeTime] = useState(ARCADE_INITIAL_TIME);
  const [arcadeStages, setArcadeStages] = useState(0);
  const [arcadeGameOver, setArcadeGameOver] = useState(false);
  const [correctHit, setCorrectHit] = useState<{ diffIdx: number; text: string; key: number } | null>(null);
  const correctHitKey = useRef(0);

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

  useEffect(() => {
    const root = document.getElementById('root');
    const prevOverflow = document.body.style.overflow;
    const prevBg = document.body.style.background;
    const prevMaxWidth = root?.style.maxWidth ?? '';
    const prevPadding = root?.style.padding ?? '';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#111827';
    if (root) {
      root.style.maxWidth = 'none';
      root.style.padding = '0';
    }

    bgmRef.current = new Audio('/assets/snapspot/sounds/bgm.mp3');
    bgmRef.current.loop = true;
    bgmRef.current.volume = bgmVolume;
    bgmRef.current.play().catch(() => {});

    correctSfxRef.current = new Audio('/assets/snapspot/sounds/correct.mp3');
    wrongSfxRef.current = new Audio('/assets/snapspot/sounds/wrong.mp3');
    clearSfxRef.current = new Audio('/assets/snapspot/sounds/clear.mp3');
    failSfxRef.current = new Audio('/assets/snapspot/sounds/fail.mp3');
    btnSfxRef.current = new Audio('/assets/snapspot/sounds/btn.mp3');

    const handleVisibility = () => {
      if (!bgmRef.current) return;
      if (document.hidden) bgmRef.current.pause();
      else bgmRef.current.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.background = prevBg;
      if (root) {
        root.style.maxWidth = prevMaxWidth;
        root.style.padding = prevPadding;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.src = '';
      }
      for (const ref of [correctSfxRef, wrongSfxRef, clearSfxRef, failSfxRef, btnSfxRef]) {
        if (ref.current) ref.current.src = '';
      }
    };
  }, []);

  // BGM 볼륨 동기화
  useEffect(() => {
    localStorage.setItem('snapspot_bgmVolume', String(bgmVolume));
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  // SFX 볼륨 동기화 (ref로 콜백 내 최신값 유지)
  useEffect(() => {
    localStorage.setItem('snapspot_sfxVolume', String(sfxVolume));
    sfxVolumeRef.current = sfxVolume;
  }, [sfxVolume]);

  useEffect(() => {
    setLevelData(null);
    setFound([]);
    setIsWinner(false);
    setIsGameOver(false);
    setWrongFlash(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHintIdx(null);
    setCurtainOpen(false);
    setImgsLoaded({ orig: false, mod: false });
    setMinWaitDone(false);
    setStageNotFound(false);
    setLastFoundIdx(null);
    setCorrectHit(null);
    if (mode === 'stage') setHearts(MAX_HEARTS);
    const minWait = mode === 'arcade' ? ARCADE_MIN_WAIT : 2000;
    const timer = setTimeout(() => setMinWaitDone(true), minWait);

    const base = mode === 'arcade' ? ARCADE_CDN_BASE : CDN_BASE;

    const applyData = (data: LevelData) => {
      setLevelData(data);
      setFound(new Array(data.differences.length).fill(false));
      // 스테이지 모드만 프리페치
      if (mode === 'stage') {
        const nextId = stageId + 1;
        if (!prefetchCache.current[nextId]) {
          fetch(`${CDN_BASE}/${nextId}.json`)
            .then(r => r.json())
            .then((nextData: LevelData) => {
              prefetchCache.current[nextId] = nextData;
              new Image().src = `${CDN_BASE}/${nextData.imageID}.jpg`;
              new Image().src = `${CDN_BASE}/${nextData.imageID}_1.jpg`;
            })
            .catch(() => {});
        }
      }
    };

    const cached = mode === 'stage' ? prefetchCache.current[stageId] : null;
    if (cached) {
      applyData(cached);
    } else {
      fetch(`${base}/${stageId}.json`)
        .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
        .then(applyData)
        .catch(() => setStageNotFound(true));
    }

    return () => clearTimeout(timer);
  }, [stageId, mode]);

  useEffect(() => {
    if (!isWinner) {
      hasAwardedCoins.current = false;
      return;
    }
    if (!hasAwardedCoins.current) {
      hasAwardedCoins.current = true;
      confetti({ particleCount: 90, angle: 60,  spread: 60, origin: { x: 0, y: 0.6 }, colors: ['#fbbf24','#22c55e','#6366f1','#f472b6','#fb923c'] });
      confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: ['#fbbf24','#22c55e','#6366f1','#f472b6','#fb923c'] });
      if (clearSfxRef.current) { clearSfxRef.current.currentTime = 0; clearSfxRef.current.volume = 0.8 * sfxVolumeRef.current; clearSfxRef.current.play().catch(() => {}); }

      if (mode === 'arcade') {
        setArcadeTime(t => t + ARCADE_BONUS_TIME);
        setArcadeStages(s => {
          const next = s + 1;
          // 최고 기록 저장
          if (auth.currentUser) {
            import('../../../services/rankingService').then(m => {
              m.saveArcadeBestScore(auth.currentUser!.uid, next).catch(console.error);
            });
          }
          return next;
        });
        // 자동으로 다음 랜덤 스테이지 로드
        if (arcadeQueue.current.length === 0) {
          arcadeQueue.current = shuffleArray(Array.from({ length: ARCADE_TOTAL }, (_, i) => i + 1));
        }
        const nextId = arcadeQueue.current.pop()!;
        setStageId(nextId);
        return;
      }

      addCoins(10);
      if (mode === 'stage') { bgmRef.current?.pause(); saveProgress(stageId); }
      if (auth.currentUser) {
        import('../../../services/rankingService').then(m => {
          m.incrementPuzzlePower(auth.currentUser!.uid).catch(console.error);
        });
      }
    }
  }, [isWinner, addCoins, mode, stageId, saveProgress]);

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
      if (!levelData || isWinner || isGameOver) return;

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
          setLastFoundIdx(i);
          const text = EXCLAMATIONS[Math.floor(Math.random() * EXCLAMATIONS.length)];
          setCorrectHit({ diffIdx: i, text, key: ++correctHitKey.current });
          setTimeout(() => setCorrectHit(null), 900);
          navigator.vibrate?.(30);
          if (correctSfxRef.current) { correctSfxRef.current.currentTime = 0; correctSfxRef.current.volume = 0.7 * sfxVolumeRef.current; correctSfxRef.current.play().catch(() => {}); }
          if (next.every(Boolean)) setIsWinner(true);
          return;
        }
      }

      if (IS_DEV) {
        console.log(`[SnapSpot] miss → canvas x=${canvasX.toFixed(1)}, y=${canvasY.toFixed(1)}`);
      }
      setWrongFlash({ x: clientX - rect.left, y: clientY - rect.top, side });
      setTimeout(() => setWrongFlash(null), 650);
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 400);
      navigator.vibrate?.(80);
      if (wrongSfxRef.current) { wrongSfxRef.current.currentTime = 0; wrongSfxRef.current.volume = 0.7 * sfxVolumeRef.current; wrongSfxRef.current.play().catch(() => {}); }

      if (mode === 'stage') {
        setHearts((h) => {
          const next = h - 1;
          if (next <= 0) {
            setIsGameOver(true);
            bgmRef.current?.pause();
            if (failSfxRef.current) { failSfxRef.current.currentTime = 0; failSfxRef.current.volume = 0.4 * sfxVolumeRef.current; failSfxRef.current.play().catch(() => {}); }
          }
          return Math.max(0, next);
        });
        setHeartShake(true);
        setTimeout(() => setHeartShake(false), 500);
      }
    },
    [levelData, found, isWinner, isGameOver, mode],
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
    if (!md.down) return;
    const dx = e.clientX - md.start.x;
    const dy = e.clientY - md.start.y;
    if (Math.hypot(dx, dy) > TAP_THRESHOLD) md.moved = true;
    if (md.moved && zoomRef.current > 1) {
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

  // 아케이드 타이머
  useEffect(() => {
    if (mode !== 'arcade' || arcadeGameOver) return;
    const interval = setInterval(() => {
      setArcadeTime(t => {
        if (t <= 1) { setArcadeGameOver(true); if (failSfxRef.current) { failSfxRef.current.currentTime = 0; failSfxRef.current.volume = 0.4 * sfxVolumeRef.current; failSfxRef.current.play().catch(() => {}); } return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, arcadeGameOver]);

  // 최소 2초 대기 + 양쪽 이미지 로드 완료 → 커튼 열기
  useEffect(() => {
    if (minWaitDone && imgsLoaded.orig && imgsLoaded.mod) setCurtainOpen(true);
  }, [minWaitDone, imgsLoaded]);

  // 힌트로 가리킨 스팟을 찾으면 마커만 해제 (hintUsed는 유지 → 재사용 불가)
  useEffect(() => {
    if (hintIdx !== null && found[hintIdx]) {
      setHintIdx(null);
    }
  }, [found, hintIdx]);

  const playBtnSfx = useCallback(() => {
    if (!btnSfxRef.current) return;
    btnSfxRef.current.currentTime = 0;
    btnSfxRef.current.volume = sfxVolumeRef.current;
    btnSfxRef.current.play().catch(() => {});
  }, []);

  const activateHint = useCallback(() => {
    const idx = found.findIndex(f => !f);
    if (idx === -1) return;
    setHintIdx(idx);
  }, [found]);

  const handleHint = useCallback(() => {
    if (hintIdx !== null) return;
    playBtnSfx();
    if (IS_DEV) {
      activateHint();
    } else if (coins >= 50) {
      spendCoins(50).then(() => activateHint());
    }
  }, [hintIdx, coins, spendCoins, activateHint, playBtnSfx]);

  // ── Ad-gated actions ────────────────────────────────────────────────────────
  const handleNextStage = useCallback(() => {
    playBtnSfx();
    bgmRef.current?.play().catch(() => {});
    if (IS_DEV || !window.adBreak) { setStageId(s => s + 1); return; }
    window.adBreak({ type: 'next', name: 'stage-clear', adBreakDone: () => setStageId(s => s + 1) });
  }, [playBtnSfx]);

  const handleRestart = useCallback(() => {
    playBtnSfx();
    if (IS_DEV || !window.adBreak) { navigate(0); return; }
    window.adBreak({ type: 'next', name: 'game-over-restart', adBreakDone: () => navigate(0) });
  }, [navigate, playBtnSfx]);

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
  const cdnBase = mode === 'arcade' ? ARCADE_CDN_BASE : CDN_BASE;
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
      <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"스냅스팟","item":"https://puzzles.tmhub.co.kr/snapspot"}]}`}</script>
      <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"SoftwareApplication","name":"스냅스팟 - 퍼즐 가든","applicationCategory":"GameApplication","operatingSystem":"Web Browser","offers":{"@type":"Offer","price":"0","priceCurrency":"KRW"}}`}</script>
    </Helmet>
    <div className="snapspot-game" ref={gameRef}>
      <div className="snapspot-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => { playBtnSfx(); navigate('/snapspot'); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', color: 'inherit' }}
          >
            <ChevronLeft size={22} />
          </button>
          <h2 className="snapspot-title">
            {mode === 'time-attack' ? 'TIME ATTACK' : mode === 'stage' ? `STAGE ${stageId}` : 'NORMAL'}
          </h2>
        </div>
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
            onClick={() => { playBtnSfx(); setShowSettings(true); }}
            style={{ padding: '4px 8px' }}
            title="사운드 설정"
          >
            <Settings size={16} />
          </button>
          <button
            className="snapspot-zoom-btn"
            onClick={() => { playBtnSfx(); setShowMarkerShop(true); }}
            style={{ padding: '4px 8px' }}
            title="마커 상점"
          >
            <Palette size={16} />
          </button>
          <button className="snapspot-zoom-btn" onClick={() => { playBtnSfx(); adjustZoom(-0.5); }} disabled={zoom <= 1}>−</button>
          <span className="snapspot-zoom-label">{zoom.toFixed(1)}×</span>
          <button className="snapspot-zoom-btn" onClick={() => { playBtnSfx(); adjustZoom(0.5); }} disabled={zoom >= MAX_ZOOM}>+</button>
        </div>
      </div>

      <div className={`snapspot-images${screenShake ? ' snapspot-shake' : ''}`}>
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
            <div style={innerStyle}>
              <img
                src={`${cdnBase}/${imageID}${side === 'mod' ? '_1' : ''}.${mode === 'arcade' ? 'webp' : 'jpg'}`}
                alt={side === 'orig' ? '원본' : '변경본'}
                draggable={false}
                onLoad={() => setImgsLoaded(prev => ({ ...prev, [side]: true }))}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src.endsWith('.jpg')) {
                    img.src = img.src.replace(/\.jpg$/, '.jpeg');
                  }
                }}
              />
              {differences.map((diff, i) => {
                if (!found[i]) return null;
                const pos = side === 'orig' ? diff.topPosition : diff.bottomPosition;
                const { left, top } = toPercent(pos, diff.colSize);
                return (
                  <div
                    key={i}
                    className={`snapspot-found-marker snapspot-marker-${selectedMarkerId}`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    {getMarkerContent(selectedMarkerId)}
                  </div>
                );
              })}
              {correctHit !== null && (() => {
                const diff = differences[correctHit.diffIdx];
                const pos = side === 'orig' ? diff.topPosition : diff.bottomPosition;
                const { left, top } = toPercent(pos, diff.colSize);
                return (
                  <React.Fragment key={correctHit.key}>
                    <div className="snapspot-correct-text" style={{ left: `${left}%`, top: `${top}%` }}>
                      {correctHit.text}
                    </div>
                    <div className="snapspot-particles" style={{ left: `${left}%`, top: `${top}%` }}>
                      {PARTICLE_DIRS.map(([tx, ty], pi) => (
                        <div
                          key={pi}
                          className="snapspot-particle"
                          style={{
                            background: PARTICLE_COLORS[pi % PARTICLE_COLORS.length],
                            '--tx0': '0px', '--ty0': '0px',
                            '--tx1': `${tx}px`, '--ty1': `${ty}px`,
                            animationDelay: `${pi * 0.02}s`,
                          } as React.CSSProperties}
                        />
                      ))}
                    </div>
                  </React.Fragment>
                );
              })()}
              {isWinner && lastFoundIdx !== null && (() => {
                const diff = differences[lastFoundIdx];
                const pos = side === 'orig' ? diff.topPosition : diff.bottomPosition;
                const { left, top } = toPercent(pos, diff.colSize);
                return (
                  <div className="snapspot-ripple" style={{ left: `${left}%`, top: `${top}%` }}>
                    <div className="snapspot-ripple-ring" />
                    <div className="snapspot-ripple-ring" />
                    <div className="snapspot-ripple-ring" />
                  </div>
                );
              })()}
              {hintIdx !== null && !found[hintIdx] && (() => {
                const diff = differences[hintIdx];
                const pos = side === 'orig' ? diff.topPosition : diff.bottomPosition;
                const { left, top } = toPercent(pos, diff.colSize);
                return (
                  <div
                    key={`hint-${hintIdx}`}
                    className="snapspot-hint-marker"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  />
                );
              })()}
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
            {wrongFlash?.side === side && (
              <div
                className="snapspot-wrong-x"
                style={{ left: wrongFlash.x, top: wrongFlash.y }}
              />
            )}
            <div className={`snapspot-curtain${curtainOpen ? ' snapspot-curtain--open' : ''}`}>
              <div className="snapspot-curtain-panel snapspot-curtain-left" />
              <div className="snapspot-curtain-panel snapspot-curtain-right" />
            </div>
          </div>
        ))}
      </div>

      {mode === 'stage' && (
        <div className="snapspot-hud">
          <div className={`snapspot-hearts${heartShake ? ' snapspot-hearts-shake' : ''}`}>
            <Heart size={32} fill="#ef4444" color="#ef4444" />
            <span className="snapspot-heart-count">X{hearts}</span>
          </div>
          <div className="snapspot-hud-slots">
            {differences.map((_, i) => (
              <div key={i} className={`snapspot-slot${i < foundCount ? ' found' : ''}`}>
                {i < foundCount && <Check size={15} strokeWidth={3} color="#3a2000" />}
              </div>
            ))}
          </div>
          <button
            className="snapspot-hint-btn"
            onClick={handleHint}
            disabled={hintIdx !== null || (!IS_DEV && coins < 50)}
          >
            <Search size={22} />
            <span>{IS_DEV ? 'HINT ∞' : '50🪙'}</span>
          </button>
        </div>
      )}

      {mode === 'arcade' && (
        <div className="snapspot-hud snapspot-arcade-hud">
          <div className="snapspot-arcade-stages">
            <span className="snapspot-arcade-stages-label">STAGE</span>
            <span className="snapspot-arcade-stages-count">{arcadeStages}</span>
          </div>
          <div className="snapspot-hud-slots">
            {differences.map((_, i) => (
              <div key={i} className={`snapspot-slot${i < foundCount ? ' found' : ''}`}>
                {i < foundCount && <Check size={15} strokeWidth={3} color="#3a2000" />}
              </div>
            ))}
          </div>
          <div className={`snapspot-arcade-timer${arcadeTime <= 10 ? ' snapspot-arcade-timer--danger' : ''}`}>
            <span className="snapspot-arcade-timer-num">{arcadeTime}</span>
          </div>
        </div>
      )}

      {isWinner && mode !== 'arcade' && (
        <div className="snapspot-win-overlay">
          <div className="snapspot-win-card">
            <div className="snapspot-win-emoji">🎉</div>
            <h2>모두 찾았어요!</h2>
            <p>{differences.length}개 차이점을 모두 발견했습니다.</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.75rem 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fefce8', border: '1px solid #eab308', borderRadius: '20px', padding: '0.4rem 0.9rem', fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                🪙 +10
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#eef2ff', border: '1px solid #6366f1', borderRadius: '20px', padding: '0.4rem 0.9rem', fontWeight: 700, color: '#4338ca', fontSize: '0.95rem' }}>
                ⚡ 퍼즐력 +1
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleNextStage}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                다음 스테이지
              </button>
              <button
                onClick={() => { playBtnSfx(); navigate('/snapspot'); }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: '1.5px solid #d1d5db', background: 'transparent', color: '#374151', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                모드 선택
              </button>
            </div>
          </div>
        </div>
      )}

      {stageNotFound && (
        <div className="snapspot-win-overlay">
          <div className="snapspot-win-card">
            <div className="snapspot-win-emoji">🚧</div>
            <h2 style={{ fontSize: '1.4rem' }}>Under Construction</h2>
            <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>More stages are on the way. Stay tuned!</p>
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => { playBtnSfx(); navigate('/snapspot'); }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {isGameOver && (
        <div className="snapspot-win-overlay">
          <div className="snapspot-win-card">
            <div className="snapspot-win-emoji">💔</div>
            <h2 style={{ color: '#ef4444' }}>게임 오버</h2>
            <p>하트를 모두 소진했습니다.</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'center' }}>
              <button
                onClick={handleRestart}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                다시 도전
              </button>
              <button
                onClick={() => { playBtnSfx(); navigate('/snapspot'); }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: '1.5px solid #d1d5db', background: 'transparent', color: '#374151', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                모드 선택
              </button>
            </div>
          </div>
        </div>
      )}
      {arcadeGameOver && (
        <div className="snapspot-win-overlay">
          <div className="snapspot-win-card">
            <div className="snapspot-win-emoji">⏱️</div>
            <h2>TIME'S UP!</h2>
            <p style={{ fontSize: '1rem', color: '#374151', margin: '0.25rem 0 0' }}>Stages Cleared</p>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#6366f1', lineHeight: 1.1, margin: '0.25rem 0 0.75rem' }}>
              {arcadeStages}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => { playBtnSfx(); navigate(0); }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Play Again
              </button>
              <button
                onClick={() => { playBtnSfx(); navigate('/snapspot'); }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: '1.5px solid #d1d5db', background: 'transparent', color: '#374151', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      {showMarkerShop && <SnapSpotMarkerShopModal onClose={() => setShowMarkerShop(false)} onPlayBtnSfx={playBtnSfx} />}
      {showSettings && (
        <SnapSpotSettingsModal
          bgmVolume={bgmVolume}
          sfxVolume={sfxVolume}
          onBgmChange={setBgmVolume}
          onSfxChange={setSfxVolume}
          onClose={() => setShowSettings(false)}
          onPlayBtnSfx={playBtnSfx}
        />
      )}
    </>
  );
};

export default SnapSpotGame;

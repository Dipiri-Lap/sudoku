import React, {
  createContext, useContext, useState, useEffect,
  useRef, useCallback, type ReactNode,
} from 'react';
import { Check } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

export type MarkerGrade = 'common' | 'rare' | 'elite' | 'unique' | 'epic' | 'legendary';

export const MARKER_GRADE_CONFIG: Record<MarkerGrade, { label: string; color: string; cost: number }> = {
  common:    { label: '일반',  color: '#94a3b8', cost: 0   },
  rare:      { label: '희귀',  color: '#3b82f6', cost: 100 },
  elite:     { label: '고급',  color: '#10b981', cost: 200 },
  unique:    { label: '유니크', color: '#f97316', cost: 300 },
  epic:      { label: '영웅',  color: '#a855f7', cost: 400 },
  legendary: { label: '전설',  color: '#f59e0b', cost: 500 },
};

export interface MarkerDesign {
  id: string;
  grade: MarkerGrade;
  label: string;
}

export const markerDesigns: MarkerDesign[] = [
  { id: 'circle',    grade: 'common',    label: '서클'    },
  { id: 'check',     grade: 'common',    label: '체크'    },
  { id: 'star',      grade: 'common',    label: '별'      },
  { id: 'thumbs',    grade: 'common',    label: '엄지'    },
  { id: 'dart',      grade: 'common',    label: '다트'    },
  { id: 'hundred',   grade: 'common',    label: '100점'   },
  { id: 'gem',       grade: 'rare',      label: '보석'    },
  { id: 'smile',     grade: 'rare',      label: '스마일'  },
  { id: 'magnify',   grade: 'rare',      label: '돋보기'  },
  { id: 'pin',       grade: 'rare',      label: '핀'      },
  { id: 'dizzy',     grade: 'rare',      label: '반짝별'  },
  { id: 'target',    grade: 'elite',     label: '타겟'    },
  { id: 'clover',    grade: 'rare',      label: '클로버'  },
  { id: 'frog',      grade: 'epic',      label: '개구리'  },
  { id: 'cherry',    grade: 'epic',      label: '벚꽃'    },
  { id: 'cactus',    grade: 'epic',      label: '선인장'  },
  { id: 'hue',       grade: 'unique',    label: '색상환'  },
  { id: 'robot',     grade: 'legendary', label: '로봇'    },
  { id: 'lightning', grade: 'unique',    label: '번개'    },
  { id: 'sparkle',   grade: 'unique',    label: '스파클'  },
  { id: 'bulb',      grade: 'unique',    label: '전구'    },
  { id: 'paw',       grade: 'elite',     label: '발바닥'  },
  { id: 'butterfly', grade: 'elite',     label: '나비'    },
  { id: 'cat',       grade: 'elite',     label: '고양이'  },
  { id: 'fox',       grade: 'elite',     label: '여우'    },
  { id: 'panda',     grade: 'elite',     label: '판다'    },
  { id: 'bomb',      grade: 'epic',      label: '폭탄'    },
  { id: 'heart',     grade: 'legendary', label: '하트'    },
  { id: 'magic',     grade: 'epic',      label: '매직'    },
  { id: 'eyes',      grade: 'epic',      label: '눈'      },
  { id: 'crown',     grade: 'unique',    label: '크라운'  },
  { id: 'rainbow',   grade: 'legendary', label: '레인보우' },
  { id: 'portal',    grade: 'legendary', label: '포탈'    },
  { id: 'arc',       grade: 'legendary', label: '전기장'  },
  { id: 'matrix',    grade: 'legendary', label: '매트릭스' },
];

const MARKER_EMOJI: Record<string, string> = {
  thumbs: '👍', dart: '🎯', hundred: '💯', star: '⭐', smile: '😊', magnify: '🔍',
  lightning: '⚡', gem: '💎', clover: '🍀',
  dizzy: '💫', magic: '🪄', eyes: '👀',
  heart: '💖', sparkle: '✨', bulb: '💡', crown: '👑',
  paw: '🐾', frog: '🐸', pin: '📌', bomb: '💣', cactus: '🌵',
  butterfly: '🦋', cat: '🐱', fox: '🦊', panda: '🐼',
};

const MARKER_ANIM_CLASS: Record<string, string> = {
  sparkle:   'snapspot-marker-spin',
  heart:     'snapspot-marker-pulse',
  bulb:      'snapspot-marker-blink',
  crown:     'snapspot-marker-crown-anim',
  eyes:      'snapspot-marker-eyeblink',
  lightning: 'snapspot-marker-lightning-strike',
  bomb:      'snapspot-marker-bomb-shake',
  cactus:    'snapspot-marker-cactus-bounce',
};

const CHERRY_PETALS: React.CSSProperties[] = [
  { '--tx': '-22px', '--ty': '-30px', '--rot': '-40deg', animationDelay: '0s',     animationDuration: '1.4s' },
  { '--tx': '18px',  '--ty': '-28px', '--rot': '25deg',  animationDelay: '0.35s',  animationDuration: '1.2s' },
  { '--tx': '30px',  '--ty': '6px',   '--rot': '55deg',  animationDelay: '0.55s',  animationDuration: '1.5s' },
  { '--tx': '16px',  '--ty': '32px',  '--rot': '-30deg', animationDelay: '0.15s',  animationDuration: '1.3s' },
  { '--tx': '-20px', '--ty': '28px',  '--rot': '45deg',  animationDelay: '0.45s',  animationDuration: '1.1s' },
  { '--tx': '-28px', '--ty': '2px',   '--rot': '-50deg', animationDelay: '0.25s',  animationDuration: '1.6s' },
] as unknown as React.CSSProperties[];

export function getMarkerContent(markerId: string): React.ReactNode {
  if (markerId === 'hundred') {
    return (
      <React.Fragment>
        <span style={{ fontSize: 22, lineHeight: 1, position: 'relative', zIndex: 1 }}>💯</span>
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
          viewBox="0 0 52 46"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="hnd-rough">
              <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="4" seed="7" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <ellipse cx="26" cy="23" rx="22" ry="19" fill="none" stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round" filter="url(#hnd-rough)"/>
        </svg>
      </React.Fragment>
    );
  }
  if (markerId === 'robot') {
    return (
      <React.Fragment>
        <span style={{ fontSize: 28, lineHeight: 1, position: 'relative', zIndex: 1 }}>🤖</span>
        <div className="snapspot-scan-line" />
      </React.Fragment>
    );
  }
  if (markerId === 'arc') {
    return (
      <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="snapspot-arc-core" />
        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, overflow: 'visible', pointerEvents: 'none' }}>
          <circle cx="22" cy="22" r="17" className="snapspot-electric-arc snapspot-electric-arc-1" />
          <circle cx="22" cy="22" r="17" className="snapspot-electric-arc snapspot-electric-arc-2" />
        </svg>
      </div>
    );
  }
  if (markerId === 'cherry') {
    return (
      <div style={{ position: 'relative', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>🌸</span>
        {CHERRY_PETALS.map((style, i) => (
          <div key={i} className="snapspot-petal" style={style} />
        ))}
      </div>
    );
  }
  if (markerId === 'magic') {
    return (
      <div style={{ position: 'relative', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>🪄</span>
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} className={`snapspot-stardust s${i}`}>✦</span>
        ))}
      </div>
    );
  }
  if (MARKER_EMOJI[markerId]) {
    return (
      <span className={MARKER_ANIM_CLASS[markerId]}
        style={{ fontSize: 26, lineHeight: 1, display: 'flex' }}>
        {MARKER_EMOJI[markerId]}
      </span>
    );
  }
  if (markerId === 'check') {
    return <Check size={22} color="#fff" strokeWidth={3} />;
  }
  if (markerId === 'matrix') {
    const drops = [
      { char: '1', left: '8%',  delay: '0s',    dur: '1.5s', bright: true  },
      { char: '0', left: '8%',  delay: '0.55s', dur: '1.5s', bright: false },
      { char: '1', left: '8%',  delay: '1.05s', dur: '1.5s', bright: false },
      { char: '0', left: '33%', delay: '0.2s',  dur: '1.2s', bright: true  },
      { char: '1', left: '33%', delay: '0.7s',  dur: '1.2s', bright: false },
      { char: '0', left: '58%', delay: '0.1s',  dur: '1.7s', bright: true  },
      { char: '1', left: '58%', delay: '0.55s', dur: '1.7s', bright: false },
      { char: '0', left: '58%', delay: '1.0s',  dur: '1.7s', bright: false },
      { char: '1', left: '83%', delay: '0.3s',  dur: '1.3s', bright: true  },
      { char: '0', left: '83%', delay: '0.8s',  dur: '1.3s', bright: false },
    ];
    return (
      <React.Fragment>
        {drops.map((d, i) => (
          <span
            key={i}
            className={`snapspot-matrix-char${d.bright ? ' bright' : ''}`}
            style={{ left: d.left, animationDelay: d.delay, animationDuration: d.dur }}
          >
            {d.char}
          </span>
        ))}
      </React.Fragment>
    );
  }
  if (markerId === 'rainbow' || markerId === 'portal' || markerId === 'hue') {
    return <div className="snapspot-marker-inner" />;
  }
  return null;
}

export const FREE_MARKER_IDS = markerDesigns.filter(d => d.grade === 'common').map(d => d.id);

const LS_UNLOCKED_KEY = 'snapspot_unlockedMarkers';
const LS_SELECTED_KEY = 'snapspot_selectedMarker';

interface SnapSpotMarkerContextValue {
  unlockedMarkers: string[];
  selectedMarkerId: string;
  hasUnlocked: (id: string) => boolean;
  unlockMarker: (id: string) => Promise<boolean>;
  selectMarker: (id: string) => void;
}

const SnapSpotMarkerContext = createContext<SnapSpotMarkerContextValue | null>(null);

export const useSnapSpotMarker = () => {
  const ctx = useContext(SnapSpotMarkerContext);
  if (!ctx) throw new Error('useSnapSpotMarker must be used within SnapSpotMarkerProvider');
  return ctx;
};

export const SnapSpotMarkerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { spendCoins } = useCoins();

  const [selectedMarkerId, setSelectedMarkerId] = useState<string>(() =>
    localStorage.getItem(LS_SELECTED_KEY) || 'circle'
  );

  const [unlockedMarkers, setUnlockedMarkers] = useState<string[]>(() => {
    const stored = localStorage.getItem(LS_UNLOCKED_KEY);
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) return [...FREE_MARKER_IDS];
      return Array.from(new Set([...FREE_MARKER_IDS, ...parsed]));
    } catch {
      return [...FREE_MARKER_IDS];
    }
  });

  const syncedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || syncedRef.current) return;
      syncedRef.current = true;
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const cloudUnlocked: string[] = snap.exists() ? (snap.data().unlockedSnapSpotMarkers || []) : [];
        let localUnlocked: string[] = [];
        try { localUnlocked = JSON.parse(localStorage.getItem(LS_UNLOCKED_KEY) || '[]'); } catch { /* */ }
        const merged = Array.from(new Set([...FREE_MARKER_IDS, ...localUnlocked, ...cloudUnlocked]));
        setUnlockedMarkers(merged);
        localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(merged));
        const cloudSelected: string | null = snap.exists() ? (snap.data().selectedSnapSpotMarker ?? null) : null;
        if (cloudSelected && merged.includes(cloudSelected)) {
          setSelectedMarkerId(cloudSelected);
          localStorage.setItem(LS_SELECTED_KEY, cloudSelected);
        }
        const payload: Record<string, unknown> = {};
        if (!merged.every(id => cloudUnlocked.includes(id))) payload.unlockedSnapSpotMarkers = merged;
        if (!cloudSelected) payload.selectedSnapSpotMarker = localStorage.getItem(LS_SELECTED_KEY) || 'circle';
        if (Object.keys(payload).length > 0) await setDoc(userRef, payload, { merge: true });
      } catch (err) {
        console.error('Failed to sync snapspot markers', err);
      }
    });
    return unsubscribe;
  }, []);

  const hasUnlocked = useCallback((id: string) => unlockedMarkers.includes(id), [unlockedMarkers]);

  const selectMarker = useCallback((id: string) => {
    if (!unlockedMarkers.includes(id)) return;
    setSelectedMarkerId(id);
    localStorage.setItem(LS_SELECTED_KEY, id);
    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid), { selectedSnapSpotMarker: id }, { merge: true }).catch(console.error);
    }
  }, [unlockedMarkers]);

  const unlockMarker = async (id: string): Promise<boolean> => {
    if (hasUnlocked(id)) return true;
    const design = markerDesigns.find(d => d.id === id);
    if (!design) return false;
    const cost = MARKER_GRADE_CONFIG[design.grade].cost;
    if (cost > 0) {
      const success = await spendCoins(cost);
      if (!success) return false;
    }
    const newUnlocked = [...unlockedMarkers, id];
    setUnlockedMarkers(newUnlocked);
    localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(newUnlocked));
    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid), { unlockedSnapSpotMarkers: newUnlocked }, { merge: true }).catch(console.error);
    }
    selectMarker(id);
    return true;
  };

  return (
    <SnapSpotMarkerContext.Provider value={{ unlockedMarkers, selectedMarkerId, hasUnlocked, unlockMarker, selectMarker }}>
      {children}
    </SnapSpotMarkerContext.Provider>
  );
};

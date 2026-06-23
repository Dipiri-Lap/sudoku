import React, {
  createContext, useContext, useState, useEffect,
  useRef, useCallback, type ReactNode,
} from 'react';
import { Check } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

export type MarkerGrade = 'common' | 'rare' | 'epic' | 'legendary';

export const MARKER_GRADE_CONFIG: Record<MarkerGrade, { label: string; color: string; cost: number }> = {
  common:    { label: '일반',  color: '#94a3b8', cost: 0   },
  rare:      { label: '희귀',  color: '#3b82f6', cost: 100 },
  epic:      { label: '영웅',  color: '#a855f7', cost: 200 },
  legendary: { label: '전설',  color: '#f59e0b', cost: 300 },
};

export interface MarkerDesign {
  id: string;
  grade: MarkerGrade;
  label: string;
}

export const markerDesigns: MarkerDesign[] = [
  { id: 'circle',   grade: 'common',    label: '서클'    },
  { id: 'check',    grade: 'common',    label: '체크'    },
  { id: 'star',     grade: 'common',    label: '별'      },
  { id: 'target',   grade: 'rare',      label: '타겟'    },
  { id: 'smile',    grade: 'rare',      label: '스마일'  },
  { id: 'pin',      grade: 'rare',      label: '핀'      },
  { id: 'heart',    grade: 'epic',      label: '하트'    },
  { id: 'sparkle',  grade: 'epic',      label: '스파클'  },
  { id: 'fire',     grade: 'epic',      label: '파이어'  },
  { id: 'crown',    grade: 'legendary', label: '크라운'  },
  { id: 'rainbow',  grade: 'legendary', label: '레인보우' },
  { id: 'portal',   grade: 'legendary', label: '포탈'    },
];

const MARKER_EMOJI: Record<string, string> = {
  star: '⭐', smile: '😊', pin: '📍',
  heart: '💖', sparkle: '✨', fire: '🔥', crown: '👑',
};

export function getMarkerContent(markerId: string): React.ReactNode {
  if (MARKER_EMOJI[markerId]) {
    return (
      <span className={markerId === 'sparkle' ? 'snapspot-marker-spin' : undefined}
        style={{ fontSize: 26, lineHeight: 1, display: 'flex' }}>
        {MARKER_EMOJI[markerId]}
      </span>
    );
  }
  if (markerId === 'check') {
    return <Check size={22} color="#fff" strokeWidth={3} />;
  }
  if (markerId === 'rainbow' || markerId === 'portal') {
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

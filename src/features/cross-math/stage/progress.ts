import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { TOTAL_STAGES } from './schedule';

const LS_KEY = 'crossum_stage_progress';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'crossumProgress', 'data');

function clamp(n: number): number {
  return Math.min(Math.max(1, n), TOTAL_STAGES);
}

/** 저장된 진행도를 읽는다. 값이 없거나 손상됐으면 1스테이지부터. */
export function loadStageProgress(): number {
  try {
    const n = parseInt(localStorage.getItem(LS_KEY) ?? '', 10);
    if (!Number.isFinite(n)) return 1;
    return clamp(n);
  } catch {
    return 1; // 사파리 프라이빗 모드 등에서 localStorage 접근이 막히는 경우
  }
}

function save(n: number) {
  try {
    localStorage.setItem(LS_KEY, String(n));
  } catch {
    // 저장 실패는 무시 — 진행은 이번 세션 동안 메모리로만 유지된다
  }
}

/**
 * 스테이지 진행도. 도전 중인 스테이지 번호를 뜻하며 뒤로 가지 않는다.
 *
 * 다른 게임(useSudokuProgress 등)과 같이 로그인하면 서버와 병합한다.
 * 서버에 없으면 퍼즐력 소급 계산에서 이 게임만 빠지므로 반드시 올려 둬야 한다.
 */
export function useCrossumProgress() {
  const [stageProgress, setStageProgress] = useState<number>(loadStageProgress);
  const syncedRef = useRef(false);

  /** 최신 진행도 — clearStage 가 상태 갱신 함수 밖에서 비교할 수 있게 들고 있는다 */
  const progressRef = useRef(stageProgress);

  useEffect(() => {
    progressRef.current = stageProgress;
    save(stageProgress);
  }, [stageProgress]);

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user || syncedRef.current) return;
      syncedRef.current = true;
      try {
        const ref = FIRESTORE_DOC(user.uid);
        const snap = await getDoc(ref);
        const cloud = snap.exists() ? Number(snap.data()?.stageProgress ?? 1) : 1;
        const local = loadStageProgress();
        // 진행도는 뒤로 가지 않으므로 양쪽 중 앞선 쪽을 쓴다
        const merged = clamp(Math.max(Number.isFinite(cloud) ? cloud : 1, local));

        setStageProgress(prev => (merged > prev ? merged : prev));
        if (merged !== cloud) await setDoc(ref, { stageProgress: merged }, { merge: true });
      } catch (e) {
        console.error('크로썸 진행도 동기화 실패', e);
      }
    });
  }, []);

  /** 해당 스테이지를 깼을 때 호출. 이미 더 앞서 있으면 그대로 둔다. */
  const clearStage = useCallback((cleared: number) => {
    const next = clamp(cleared + 1);
    if (next <= progressRef.current) return;
    progressRef.current = next;
    setStageProgress(next);
    const user = auth.currentUser;
    if (user) {
      setDoc(FIRESTORE_DOC(user.uid), { stageProgress: next }, { merge: true }).catch(console.error);
    }
  }, []);

  return { stageProgress, clearStage };
}

// ── 별 3개 평가 ──────────────────────────────────────────────────────────────

const STARS_KEY = 'crossum_stage_stars';

/** 스테이지 번호 → 최고 별 수(1~3) */
type StarMap = Record<string, number>;

/**
 * 감점 → 별. 감점은 틀린 식을 완성한 횟수 + 힌트 사용 횟수.
 *   0 → ★3, 1~2 → ★2, 3 이상 → ★1 (깨기만 하면 최소 1개)
 */
export function starsFor(penalty: number): number {
  if (penalty <= 0) return 3;
  if (penalty <= 2) return 2;
  return 1;
}

function loadStars(): StarMap {
  try {
    const raw = JSON.parse(localStorage.getItem(STARS_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as StarMap) : {};
  } catch {
    return {};
  }
}

function saveStars(map: StarMap) {
  try {
    localStorage.setItem(STARS_KEY, JSON.stringify(map));
  } catch {
    // 저장 실패는 무시
  }
}

/** 두 기록을 합친다 — 스테이지마다 더 많은 별을 남긴다 */
function mergeStars(a: StarMap, b: StarMap): StarMap {
  const out: StarMap = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > (out[k] ?? 0)) out[k] = Math.min(3, n);
  }
  return out;
}

/**
 * 스테이지별 최고 별 기록. 진행도와 같은 문서(crossumProgress/data)의 stars 필드에 병합한다.
 * 기록은 더 높을 때만 갱신된다 — 다시 풀어서 별이 줄어도 예전 기록이 남는다.
 */
export function useCrossumStars() {
  const [stars, setStars] = useState<StarMap>(loadStars);
  const starsRef = useRef(stars);
  const syncedRef = useRef(false);

  useEffect(() => {
    starsRef.current = stars;
    saveStars(stars);
  }, [stars]);

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user || syncedRef.current) return;
      syncedRef.current = true;
      try {
        const ref = FIRESTORE_DOC(user.uid);
        const snap = await getDoc(ref);
        const cloud = (snap.exists() ? snap.data()?.stars : null) as StarMap | null ?? {};
        const merged = mergeStars(cloud, loadStars());
        setStars(prev => mergeStars(prev, merged));
        if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
          await setDoc(ref, { stars: merged }, { merge: true });
        }
      } catch (e) {
        console.error('크로썸 별 기록 동기화 실패', e);
      }
    });
  }, []);

  const recordStars = useCallback((stage: number, n: number) => {
    const key = String(stage);
    if ((starsRef.current[key] ?? 0) >= n) return;
    const next = { ...starsRef.current, [key]: n };
    starsRef.current = next;
    setStars(next);
    const user = auth.currentUser;
    if (user) {
      // 필드 하나만 갱신 — 다른 스테이지 기록을 덮어쓰지 않는다
      setDoc(FIRESTORE_DOC(user.uid), { stars: { [key]: n } }, { merge: true }).catch(console.error);
    }
  }, []);

  const totalStars = Object.values(stars).reduce((a, b) => a + (Number(b) || 0), 0);
  return { stars, totalStars, recordStars };
}

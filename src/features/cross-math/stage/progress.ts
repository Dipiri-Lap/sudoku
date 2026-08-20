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

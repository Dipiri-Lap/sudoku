import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

// 예전부터 쓰던 로컬 키를 그대로 쓴다 — 이미 진행한 사용자의 기록이 이어진다.
const LS_KEY = 'arrowPuzzleProgress';
const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'arrowProgress', 'data');

/** 저장된 진행도(클리어한 최고 스테이지 번호)를 읽는다. 없거나 손상됐으면 0. */
export function loadArrowProgress(): number {
  try {
    const n = Number(localStorage.getItem(LS_KEY) ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0; // 사파리 프라이빗 모드 등에서 localStorage 접근이 막히는 경우
  }
}

function save(n: number) {
  try {
    if (n > loadArrowProgress()) localStorage.setItem(LS_KEY, String(n));
  } catch {
    // 저장 실패는 무시 — 진행은 이번 세션 동안 메모리로만 유지된다
  }
}

/**
 * 애로우웨이 스테이지 진행도. 클리어한 최고 스테이지 번호이며 뒤로 가지 않는다(0 = 아직 없음).
 *
 * 다른 게임(useCrossumProgress 등)과 같이 로그인하면 서버(users/{uid}/arrowProgress/data.clearedStage)와
 * 병합한다. 서버에 없으면 도전과제·퍼즐력 소급 계산에서 이 게임만 빠지므로 반드시 올려 둬야 한다.
 */
export function useArrowProgress() {
  const [progress, setProgress] = useState<number>(loadArrowProgress);
  const syncedRef = useRef(false);

  /** 최신 진행도 — clearStage 가 상태 갱신 함수 밖에서 비교할 수 있게 들고 있는다 */
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
    save(progress);
  }, [progress]);

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user || syncedRef.current) return;
      syncedRef.current = true;
      try {
        const ref = FIRESTORE_DOC(user.uid);
        const snap = await getDoc(ref);
        const cloud = snap.exists() ? Number(snap.data()?.clearedStage ?? 0) : 0;
        const local = loadArrowProgress();
        // 진행도는 뒤로 가지 않으므로 양쪽 중 앞선 쪽을 쓴다
        const merged = Math.max(Number.isFinite(cloud) ? cloud : 0, local);

        setProgress(prev => (merged > prev ? merged : prev));
        if (merged !== cloud) await setDoc(ref, { clearedStage: merged }, { merge: true });
      } catch (e) {
        console.error('애로우웨이 진행도 동기화 실패', e);
      }
    });
  }, []);

  /** 해당 스테이지를 깼을 때 호출. 이미 더 앞서 있으면 그대로 둔다. */
  const clearStage = useCallback((cleared: number) => {
    if (cleared <= progressRef.current) return;
    progressRef.current = cleared;
    setProgress(cleared);
    const user = auth.currentUser;
    if (user) {
      setDoc(FIRESTORE_DOC(user.uid), { clearedStage: cleared }, { merge: true }).catch(console.error);
    }
  }, []);

  return { progress, clearStage };
}

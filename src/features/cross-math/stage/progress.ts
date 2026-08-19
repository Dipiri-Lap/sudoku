import { useCallback, useEffect, useState } from 'react';
import { TOTAL_STAGES } from './schedule';

const LS_KEY = 'crossum_stage_progress';

/** 저장된 진행도를 읽는다. 값이 없거나 손상됐으면 1스테이지부터. */
export function loadStageProgress(): number {
  try {
    const n = parseInt(localStorage.getItem(LS_KEY) ?? '', 10);
    if (!Number.isFinite(n)) return 1;
    return Math.min(Math.max(1, n), TOTAL_STAGES);
  } catch {
    return 1; // 사파리 프라이빗 모드 등에서 localStorage 접근이 막히는 경우
  }
}

/**
 * 스테이지 진행도. 도전 중인 스테이지 번호를 뜻하며 뒤로 가지 않는다.
 * (스도쿠의 useSudokuProgress 와 같은 방식이되, 이 게임은 로컬 저장만 한다)
 */
export function useCrossumProgress() {
  const [stageProgress, setStageProgress] = useState<number>(loadStageProgress);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(stageProgress));
    } catch {
      // 저장 실패는 무시 — 진행은 이번 세션 동안 메모리로만 유지된다
    }
  }, [stageProgress]);

  /** 해당 스테이지를 깼을 때 호출. 이미 더 앞서 있으면 그대로 둔다. */
  const clearStage = useCallback((cleared: number) => {
    const next = Math.min(cleared + 1, TOTAL_STAGES);
    setStageProgress(prev => (next > prev ? next : prev));
  }, []);

  return { stageProgress, clearStage };
}

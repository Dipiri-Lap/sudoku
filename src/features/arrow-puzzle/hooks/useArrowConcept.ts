import { useCallback, useState } from 'react';

export type ArrowConcept = 'mono' | 'way' | 'way-tile';

const KEY = 'arrowPuzzleSelectedConcept';

export interface ConceptMeta {
  id: ArrowConcept;
  name: string;
  desc: string;
}

export const ARROW_CONCEPTS: ConceptMeta[] = [
  { id: 'mono', name: 'Arrow Mono', desc: '검정 배경 · 흰 선 · 하트 3개로 즐기는 미니멀 컨셉' },
  { id: 'way', name: 'ArrowWay', desc: '알록달록 젤리로 즐기는 오리지널 컨셉' },
  { id: 'way-tile', name: 'ArrowWay Tile', desc: '알록달록 젤리 + 입체 타일판으로 즐기는 컨셉' },
];

function loadConcept(): ArrowConcept {
  const v = localStorage.getItem(KEY);
  return v === 'way' || v === 'way-tile' ? v : 'mono';
}

/** 같은 /arrow-puzzle 경로 안에서 어떤 컨셉(스킨)을 보여줄지 — 상점에서 바꾸면 기기에 저장된다. */
export function useArrowConcept() {
  const [concept, setConceptState] = useState<ArrowConcept>(loadConcept);

  const setConcept = useCallback((c: ArrowConcept) => {
    localStorage.setItem(KEY, c);
    setConceptState(c);
  }, []);

  return { concept, setConcept };
}

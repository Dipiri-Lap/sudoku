import type { CrossMathLevel } from '../utils/generator';
import { decodeLevel } from './codec';
import { TOTAL_STAGES } from './schedule';

interface StageChunk {
  from: number;
  to: number;
  levels: string[];
}

/**
 * 스테이지 데이터는 100개 단위로 나뉘어 있고 필요한 묶음만 지연 로딩한다.
 * 전체를 한 번에 번들에 넣으면 첫 화면 로딩에 불필요한 비용이 붙는다.
 */
const CHUNK_LOADERS: Array<() => Promise<{ default: StageChunk }>> = [
  () => import('../data/stages/stages-001-100.json'),
  () => import('../data/stages/stages-101-200.json'),
  () => import('../data/stages/stages-201-300.json'),
  () => import('../data/stages/stages-301-400.json'),
  () => import('../data/stages/stages-401-500.json'),
  () => import('../data/stages/stages-501-600.json'),
  () => import('../data/stages/stages-601-700.json'),
  () => import('../data/stages/stages-701-800.json'),
  () => import('../data/stages/stages-801-900.json'),
  () => import('../data/stages/stages-901-1000.json'),
  () => import('../data/stages/stages-1001-1100.json'),
  () => import('../data/stages/stages-1101-1200.json'),
];

const cache = new Map<number, Promise<StageChunk>>();

function chunkFor(stage: number): Promise<StageChunk> {
  const index = Math.floor((stage - 1) / 100);
  let pending = cache.get(index);
  if (!pending) {
    pending = CHUNK_LOADERS[index]().then(m => m.default);
    cache.set(index, pending);
  }
  return pending;
}

export async function loadStage(stage: number): Promise<CrossMathLevel> {
  if (stage < 1 || stage > TOTAL_STAGES) {
    throw new Error(`스테이지 범위를 벗어났습니다: ${stage} (1~${TOTAL_STAGES})`);
  }
  const chunk = await chunkFor(stage);
  const encoded = chunk.levels[stage - chunk.from];
  if (!encoded) throw new Error(`스테이지 ${stage} 데이터가 비어 있습니다`);
  return decodeLevel(encoded);
}

/** 다음 스테이지로 넘어가기 전 해당 묶음을 미리 받아 둔다. */
export function prefetchStage(stage: number): void {
  if (stage >= 1 && stage <= TOTAL_STAGES) void chunkFor(stage);
}

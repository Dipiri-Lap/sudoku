import type { StageData } from './levels';
import { ARROW_MAX_STAGE } from './limits';

/**
 * 캠페인 스테이지는 100개 단위 묶음(data/stages/*.json)으로 나뉘어 있고, 플레이할 스테이지가 든 묶음만 지연 로딩한다.
 * 전체(수 MB)를 정적 import 하면 애로우웨이뿐 아니라 사이트 모든 페이지의 메인 번들에 실린다.
 * 묶음은 scripts/split-arrow-stages.mjs 가 stages.full.json 에서 만든다.
 *
 * 공개 전 묶음(901~1000)은 dev 에서만 로더를 둔다 — 배포 빌드에선 DEV 가 false 로 치환되어 파일 자체가 빠진다.
 * 공개 범위(ARROW_MAX_STAGE)를 늘리면 해당 묶음의 DEV 조건도 풀어야 한다.
 */
type ChunkLoader = () => Promise<{ default: unknown }>;
const CHUNK_LOADERS: (ChunkLoader | null)[] = [
  () => import('./stages/stages-001-100.json'),
  () => import('./stages/stages-101-200.json'),
  () => import('./stages/stages-201-300.json'),
  () => import('./stages/stages-301-400.json'),
  () => import('./stages/stages-401-500.json'),
  () => import('./stages/stages-501-600.json'),
  () => import('./stages/stages-601-700.json'),
  () => import('./stages/stages-701-800.json'),
  () => import('./stages/stages-801-900.json'),
  import.meta.env.DEV ? () => import('./stages/stages-901-1000.json') : null,
];

/** 플레이할 수 있는 캠페인 스테이지 수 */
export const STAGE_COUNT = ARROW_MAX_STAGE;

const cache = new Map<number, Promise<StageData[]>>();

function chunkFor(level: number): Promise<StageData[]> {
  const index = Math.floor((level - 1) / 100);
  let pending = cache.get(index);
  if (!pending) {
    const loader = CHUNK_LOADERS[index];
    if (!loader) return Promise.reject(new Error(`스테이지 ${level} 묶음이 없습니다`));
    pending = loader().then(m => m.default as StageData[]);
    // 네트워크 오류로 실패한 묶음은 다음 시도에서 다시 받도록 캐시에서 뺀다
    pending.catch(() => cache.delete(index));
    cache.set(index, pending);
  }
  return pending;
}

export async function loadStage(level: number): Promise<StageData> {
  if (level < 1 || level > STAGE_COUNT) throw new Error(`스테이지 범위를 벗어났습니다: ${level} (1~${STAGE_COUNT})`);
  const chunk = await chunkFor(level);
  const stage = chunk[(level - 1) % 100];
  if (!stage || stage.level !== level) throw new Error(`스테이지 ${level} 데이터가 맞지 않습니다`);
  return stage;
}

/** 다음 스테이지로 넘어가기 전에 해당 묶음을 미리 받아 둔다 */
export function prefetchStage(level: number): void {
  if (level >= 1 && level <= STAGE_COUNT) chunkFor(level).catch(() => {});
}

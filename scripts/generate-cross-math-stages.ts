import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLevelFromConfig, DIFFICULTY_CONFIGS } from '../src/features/cross-math/utils/generator';
import { stageDifficulty, stageLevel, stageTripleRatio, isMilestone, TOTAL_STAGES } from '../src/features/cross-math/stage/schedule';
import { encodeLevel, decodeLevel } from '../src/features/cross-math/stage/codec';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../src/features/cross-math/data/stages');

const CHUNK = 100;
/** generateLevelForDifficulty 는 내부적으로 80회 재시도 후 null 을 준다. 그래도 실패하면 여기서 더 돌린다. */
const MAX_RETRY = 40;

interface Chunk {
  from: number;
  to: number;
  /** from 스테이지부터 순서대로. codec.decodeLevel 로 복원한다. */
  levels: string[];
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

/**
 * 사용법:
 *   npm run generate-cross-math-stages            → 1 ~ TOTAL_STAGES 전체
 *   npm run generate-cross-math-stages 501 600    → 해당 구간만 (이미 만든 묶음은 건드리지 않음)
 */
function main() {
  const argFrom = Number(process.argv[2]);
  const argTo = Number(process.argv[3]);
  const rangeFrom = Number.isFinite(argFrom) && Number.isFinite(argTo) ? argFrom : 1;
  const rangeTo = Number.isFinite(argTo) ? argTo : Number.isFinite(argFrom) ? argFrom : TOTAL_STAGES;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const started = Date.now();
  let totalBytes = 0;
  const failures: number[] = [];

  // 묶음 경계에 맞춰 정렬 — 한 파일은 항상 100개 단위다
  const firstChunk = Math.floor((rangeFrom - 1) / CHUNK) * CHUNK + 1;

  for (let from = firstChunk; from <= rangeTo; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, rangeTo);
    const levels: string[] = [];

    for (let stage = from; stage <= to; stage++) {
      const base = DIFFICULTY_CONFIGS[stageDifficulty(stage)];
      // 관문(25의 배수)은 숫자 없이 부호만 남은 식이 많은 형태로 만든다
      const cfg = { ...base, tripleRatio: stageTripleRatio(stage), fullLineBias: isMilestone(stage) };
      let encoded: string | null = null;

      for (let retry = 0; retry < MAX_RETRY && !encoded; retry++) {
        const level = generateLevelFromConfig(cfg);
        if (!level) continue;
        const text = encodeLevel(level);
        // 저장한 문자열이 원본으로 정확히 되돌아오는지 확인한 것만 채택한다.
        // 데이터가 한 번 깨지면 해당 스테이지는 영원히 진입 불가가 되므로 여기서 막는다.
        if (JSON.stringify(decodeLevel(text)) !== JSON.stringify(level)) {
          throw new Error(`스테이지 ${stage}: 인코딩 왕복 불일치`);
        }
        encoded = text;
      }

      if (!encoded) {
        failures.push(stage);
        levels.push('');
        continue;
      }
      levels.push(encoded);
    }

    const chunk: Chunk = { from, to, levels };
    const file = path.join(OUT_DIR, `stages-${pad(from)}-${pad(to)}.json`);
    const json = JSON.stringify(chunk);
    fs.writeFileSync(file, json);
    totalBytes += json.length;
    console.log(`  ${path.basename(file)}  ${(json.length / 1024).toFixed(0)}KB`);
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n스테이지 ${firstChunk}~${rangeTo} 생성 완료 — ${secs}초, 합계 ${(totalBytes / 1024).toFixed(0)}KB`);

  if (failures.length > 0) {
    console.error(`\n생성 실패 ${failures.length}개: ${failures.join(', ')}`);
    process.exit(1);
  }

  // 난이도 분포 요약
  const dist = new Map<number, number>();
  for (let s = firstChunk; s <= rangeTo; s++) dist.set(stageLevel(s), (dist.get(stageLevel(s)) ?? 0) + 1);
  console.log(
    '난이도 분포: ' +
      [...dist].sort((a, b) => a[0] - b[0]).map(([lv, n]) => `lv${lv}×${n}`).join('  ')
  );
}

main();

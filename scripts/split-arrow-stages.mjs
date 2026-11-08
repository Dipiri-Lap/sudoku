/**
 * 애로우웨이 스테이지 원본(stages.full.json)을 100개 단위 묶음으로 나눠 앱이 지연 로딩할 파일을 만든다.
 *
 * 앱은 stages.full.json 을 직접 불러오지 않는다 — 플레이하는 스테이지가 들어 있는 묶음만 받는다
 * (src/features/arrow-puzzle/data/stageLoader.ts). 스테이지를 생성·교체한 뒤에는 이 스크립트를 다시 돌린다.
 *
 *   node scripts/split-arrow-stages.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';

const SRC = 'src/features/arrow-puzzle/data/stages.full.json';
const OUT_DIR = 'src/features/arrow-puzzle/data/stages';
const CHUNK = 100;

const stages = JSON.parse(readFileSync(SRC, 'utf-8'));
stages.forEach((s, i) => {
  if (s.level !== i + 1) throw new Error(`${i + 1}번째 항목의 level 이 ${s.level} 입니다`);
});

mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(OUT_DIR)) if (/^stages-\d+-\d+\.json$/.test(f)) unlinkSync(`${OUT_DIR}/${f}`);

const pad = n => String(n).padStart(3, '0');
for (let from = 1; from <= stages.length; from += CHUNK) {
  const to = Math.min(from + CHUNK - 1, stages.length);
  const name = `stages-${pad(from)}-${pad(to)}.json`;
  writeFileSync(`${OUT_DIR}/${name}`, JSON.stringify(stages.slice(from - 1, to)) + '\n');
  console.log(name);
}

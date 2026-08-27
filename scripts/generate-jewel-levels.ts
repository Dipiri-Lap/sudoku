import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLevel, DEFAULT_FIT, type Generated } from '../src/features/jewel-kingdom/engine/generate';
import { recipeFor, targetWinRate, LAST_SCHEDULED } from '../src/features/jewel-kingdom/data/schedule';
import { makeRng } from '../src/features/jewel-kingdom/engine/rng';

/**
 * 레벨을 만들어 파일로 굽는다.
 *
 * 실행할 때마다 만드는 게 아니라 **한 번 구워서 커밋한다.** 이유:
 *  - 한 판을 맞추는 데 봇을 수백 번 돌린다. 앱 실행 중에 할 일이 아니다
 *  - 구워두면 사람이 열어보고 고칠 수 있다. 생성기가 만든 게 마음에 안 들면
 *    그 줄만 손으로 고치면 된다
 *  - 같은 레벨 번호가 늘 같은 판이어야 한다. "어제 깬 12레벨"이 오늘 다른
 *    판이면 진행도라는 말이 성립하지 않는다
 *
 * 사용법:
 *   npm run generate-jewel-levels          → 1 ~ LAST_SCHEDULED 전체
 *   npm run generate-jewel-levels 20 30    → 그 구간만
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/features/jewel-kingdom/data');
/** 레벨 데이터. 구간만 다시 구울 수 있게 JSON으로 둔다 */
const OUT_JSON = path.join(DATA_DIR, 'generated-levels.json');

/** 승률 측정 판 수. 늘리면 정확해지고 그만큼 느려진다. */
const RUNS = 30;

function main() {
  const argFrom = Number(process.argv[2]);
  const argTo = Number(process.argv[3]);
  const from = Number.isFinite(argFrom) ? argFrom : 1;
  const to = Number.isFinite(argTo) ? argTo : Number.isFinite(argFrom) ? argFrom : LAST_SCHEDULED;

  const started = Date.now();
  const made: Generated[] = [];
  const failed: number[] = [];
  let measured = 0;

  for (let n = from; n <= to; n++) {
    const target = targetWinRate(n);
    // 시드를 레벨 번호에서 뽑는다 - 다시 구워도 같은 판이 나온다.
    const g = generateLevel(n, recipeFor(n), makeRng(n * 7919 + 13), {
      ...DEFAULT_FIT,
      target,
      runs: RUNS,
    });

    if (!g) {
      failed.push(n);
      console.log(`  ${String(n).padStart(3)}  실패 (목표 ${(target * 100).toFixed(0)}%)`);
      continue;
    }

    measured += g.measured;
    made.push(g);
    const gap = g.winRate - target;
    console.log(
      `  ${String(n).padStart(3)}  수 ${String(g.level.moves).padStart(2)}` +
        `  승률 ${(g.winRate * 100).toFixed(0)}%` +
        `  (목표 ${(target * 100).toFixed(0)}%, ${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(0)})` +
        `  시도 ${g.attempt}`,
    );
  }

  // 구간만 구웠어도 나머지는 그대로 둔다. 60판을 한 번에 굽는 데 몇 분씩
  // 걸리므로, 진행표 한 줄 고칠 때마다 전부 다시 굽게 하면 손이 안 간다.
  const kept: Record<string, unknown>[] = fs.existsSync(OUT_JSON)
    ? (JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')).levels as Record<string, unknown>[])
    : [];

  const byId = new Map<number, Record<string, unknown>>();
  kept.forEach(l => byId.set(l.id as number, l));
  made.forEach(g => {
    const lv = g.level;
    byId.set(lv.id, {
      id: lv.id,
      layout: lv.layout,
      moves: lv.moves,
      colors: lv.colors,
      goals: lv.goals,
      ...(lv.turnEnd ? { turnEnd: lv.turnEnd } : {}),
      // 사람이 열어봤을 때 "이 판이 얼마나 어려운가"를 알 수 있어야 한다.
      winRate: Number(g.winRate.toFixed(2)),
      target: Number(targetWinRate(lv.id).toFixed(2)),
    });
  });

  const levels = [...byId.values()].sort((a, b) => (a.id as number) - (b.id as number));
  fs.writeFileSync(OUT_JSON, JSON.stringify({ runs: RUNS, levels }, null, 1), 'utf8');

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\n${made.length}개 생성 (전체 ${levels.length}개) — ${secs}초, 봇 ${measured.toLocaleString()}판\n` +
      `→ ${path.relative(process.cwd(), OUT_JSON)}`,
  );

  if (failed.length > 0) {
    console.error(`\n실패 ${failed.length}개: ${failed.join(', ')}`);
    console.error('진행표(schedule.ts)의 재료나 목표 승률을 손봐야 한다.');
    process.exit(1);
  }
}

main();

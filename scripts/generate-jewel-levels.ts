import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLevel, DEFAULT_FIT, type Generated } from '../src/features/jewel-kingdom/engine/generate';
import { heavierRecipe, lighterRecipe, recipeFor, targetWinRate, tierFor, LAST_SCHEDULED } from '../src/features/jewel-kingdom/data/schedule';
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
 *   OUT=경로.json npx tsx ...               → 다른 파일에 굽는다(여러 개를 동시에 구울 때.
 *                                             scripts/bake-jewel-levels.mjs가 이렇게 나눠 굽고 합친다)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/features/jewel-kingdom/data');
/** 레벨 데이터. 구간만 다시 구울 수 있게 JSON으로 둔다 */
const OUT_JSON = process.env.OUT ? path.resolve(process.env.OUT) : path.join(DATA_DIR, 'generated-levels.json');

/** 승률 측정 판 수. 늘리면 정확해지고 그만큼 느려진다. */
const RUNS = 30;

function main() {
  // "27,40,157"처럼 쉼표 목록을 주면 그 판들만 굽는다
  const list = process.argv[2]?.includes(',') ? process.argv[2].split(',').map(Number) : null;
  const argFrom = Number(process.argv[2]);
  const argTo = Number(process.argv[3]);
  const from = Number.isFinite(argFrom) ? argFrom : 1;
  const to = Number.isFinite(argTo) ? argTo : Number.isFinite(argFrom) ? argFrom : LAST_SCHEDULED;
  const numbers = list ?? Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const started = Date.now();
  const made: Generated[] = [];
  const failed: number[] = [];
  let measured = 0;

  const targets = new Map<number, number>();
  for (const n of numbers) {
    // 목표에 못 닿으면 방향을 바꿔 가며 다시 만든다.
    //  - 너무 쉬워서(할 일이 적어서) 최소 수에서도 목표보다 쉬우면 → 재료를 늘린다
    //  - 너무 어려워서 최대 수로도 못 닿으면 → 곁들인 재료를 덜고, 그래도 안 되면 목표를 낮춘다
    // 어느 쪽인지 미리 알 수 없어서 순서대로 시도한다. 끝까지 안 되면 실패로 남긴다.
    const base = recipeFor(n);
    const plans = [
      { recipe: base, shift: 0 },
      { recipe: heavierRecipe(base, 1, n), shift: 0 },
      { recipe: heavierRecipe(base, 2, n), shift: 0 },
      { recipe: lighterRecipe(base, 1), shift: 0 },
      { recipe: lighterRecipe(base, 2), shift: 0 },
      { recipe: lighterRecipe(base, 2), shift: -0.08 },
      { recipe: lighterRecipe(base, 3), shift: -0.15 },
      // 모양 있는 판(다이아몬드 등)은 칸이 적어서 재료가 많으면 판이 거의 막힌다 - 사각형으로
      { recipe: { ...base, shape: 'full' as const, mask: undefined }, shift: 0 },
      { recipe: { ...lighterRecipe(base, 1), shape: 'full' as const, mask: undefined }, shift: -0.08 },
      { recipe: { ...lighterRecipe(base, 3), shape: 'full' as const, mask: undefined }, shift: -0.15 },
      // 마지막: 재료는 그대로 두고 목표 승률만 낮춘다 - 재료를 덜면 너무 쉽고(최소 수에서도
      // 승률 100%) 그대로면 조금 모자란 판(44판: 계란 6개 + 닭장)이 끝내 빠지지 않게
      { recipe: base, shift: -0.2 },
      { recipe: { ...base, shape: 'full' as const, mask: undefined }, shift: -0.25 },
    ];
    let g: Generated | null = null;
    let target = targetWinRate(n);
    for (const [i, plan] of plans.entries()) {
      target = Math.max(0.2, targetWinRate(n) + plan.shift);
      // 시드를 레벨 번호에서 뽑는다 - 다시 구워도 같은 판이 나온다.
      g = generateLevel(n, plan.recipe, makeRng(n * 7919 + 13 + i), {
        ...DEFAULT_FIT,
        target,
        runs: RUNS,
        // 수를 조여서 어렵게 만든 짧은 판은 운에 좌우된다 - 최소 10수(초반 열 판은 5수)
        minMoves: n <= 10 ? 5 : 10,
      });
      if (g) break;
    }
    targets.set(n, target);

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
      target: Number((targets.get(lv.id) ?? targetWinRate(lv.id)).toFixed(2)),
      // 판의 성격(쉬어가는 판·어려운 판 등). 화면에 "어려운 판" 표시를 할 때 쓴다
      tier: tierFor(lv.id),
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

/**
 * 애로우 퍼즐 캠페인 레벨 1000개 생성.
 *
 * 난이도 = "지금 나갈 수 있는 피스를 찾는 탐색 비용"이다.
 * (피스는 판에서 나가기만 하므로 순서를 잘못 골라 막히는 일이 없다 —
 *  즉 계획이 아니라 탐색만이 난이도다.)
 * 무작위로 누르는 플레이어의 기대 헛클릭 수로 이를 정량화한다.
 *
 * 1~300은 등비 곡선으로 단조 상승(램프), 301~1000은 폰 화면 격자 상한(20x20)에
 * 막혀 더 못 올라가는 대신 40판 주기로 오르내리는 정체기다. 자세한 이유는
 * 아래 RAMP_END 주변 주석 참고.
 *
 *   npx tsx scripts/generate-arrow-levels.ts
 */
import { writeFileSync } from 'node:fs';
import { generateLevel, generateShapedLevel } from '../src/features/arrow-puzzle/utils/levelGenerator';
import type { LevelData, Direction, PieceData } from '../src/features/arrow-puzzle/data/levels';
// 모양 정의는 공용 모듈에 있다 — 새 모양은 거기에 한 줄 추가하면 여기까지 따라온다.
import { SHAPES, buildMask, fitMask } from '../src/features/arrow-puzzle/utils/shapes';

// ── 난이도 측정 ──────────────────────────────────────────────────────────────

function selfBlocked(cells: [number, number][], dir: Direction): boolean {
  const n = cells.length;
  const [hc, hr] = cells[n - 1];
  for (let i = 0; i < n - 1; i++) {
    const [bc, br] = cells[i];
    let d = 0;
    if (dir === 'right' && br === hr && bc > hc) d = bc - hc;
    if (dir === 'left' && br === hr && bc < hc) d = hc - bc;
    if (dir === 'up' && bc === hc && br < hr) d = hr - br;
    if (dir === 'down' && bc === hc && br > hr) d = br - hr;
    if (d > 0 && i >= d) return true;
  }
  return false;
}

function canEscape(p: PieceData, occ: Set<string>, cols: number, rows: number): boolean {
  if (selfBlocked(p.cells, p.exitDir)) return false;
  const [hc, hr] = p.cells[p.cells.length - 1];
  switch (p.exitDir) {
    case 'right': for (let c = hc + 1; c < cols; c++) if (occ.has(`${c},${hr}`)) return false; return true;
    case 'left':  for (let c = hc - 1; c >= 0; c--)  if (occ.has(`${c},${hr}`)) return false; return true;
    case 'up':    for (let r = hr - 1; r >= 0; r--)  if (occ.has(`${hc},${r}`)) return false; return true;
    case 'down':  for (let r = hr + 1; r < rows; r++) if (occ.has(`${hc},${r}`)) return false; return true;
  }
}

/** 한 판을 끝까지 풀어보며 기대 헛클릭 수를 누적한다. null이면 풀 수 없는 레벨. */
function searchCost(lv: LevelData): number | null {
  let ps = [...lv.pieces];
  const occ = new Set<string>(ps.flatMap(p => p.cells.map(([c, r]) => `${c},${r}`)));
  let cost = 0;
  while (ps.length) {
    const open = ps.filter(p => {
      for (const [c, r] of p.cells) occ.delete(`${c},${r}`);
      const ok = canEscape(p, occ, lv.gridCols, lv.gridRows);
      for (const [c, r] of p.cells) occ.add(`${c},${r}`);
      return ok;
    });
    if (open.length === 0) return null;
    cost += ps.length / open.length - 1;
    const pick = open[Math.floor(Math.random() * open.length)];
    for (const [c, r] of pick.cells) occ.delete(`${c},${r}`);
    ps = ps.filter(p => p.id !== pick.id);
  }
  return cost;
}

function measure(lv: LevelData, runs: number): number | null {
  let sum = 0;
  for (let i = 0; i < runs; i++) {
    const c = searchCost(lv);
    if (c === null) return null;
    sum += c;
  }
  return sum / runs;
}

// ── 곡선 ─────────────────────────────────────────────────────────────────────

// 1000판 설계를 그대로 쓰되, 우선 100판만 먼저 뽑아 흐름을 확인한다.
// 캡(피스 밀도/줌) 논의는 아직 반영 전 — 상한 없이 원래 곡선 그대로.
const COUNT = 100;
const MAX_SIDE = 20;    // 폰 화면 기준 격자 상한

// COUNT판을 세 구간으로 나눈다.
//   도입부(1~10): 아래 INTRO 표로 직접 지정.
//   램프(11~RAMP_END): 등비 곡선으로 단조 상승 — 체감 난이도가 가장 가파르게 오르는 구간.
//   정체기(RAMP_END+1~COUNT): 판이 이미 폰 화면 상한(20x20)에 가까워 더는 "커져서" 어려워질 수 없다.
//   대신 CYCLE판 주기로 올랐다 내렸다를 반복해 상급자용으로 오래 즐길 수 있게 한다 —
//   계속 단조 증가만 시키면 board/pieces 조합의 가짓수가 금방 바닥나 후보를 못 찾는다.
// 1000판 설계(램프 290 : 정체기 700 ≈ 3:7, 주기 40 = 상승30+완화10)와 같은 비율로 100판에 맞췄다.
const RAMP_END = 40;
const CYCLE = 20;        // 정체기 한 주기(판 수)
const CYCLE_RISE = 15;   // 그중 상승에 쓰는 판 수 — 나머지는 완화

// 모양 스테이지를 사이사이에 배치한다.
// 비용만 보고 고르면 배치가 통제되지 않아 한쪽에 뭉친다(이전 결과: L17~21 연속, L1~11 전무).
// 자리를 먼저 정하고 그 자리엔 모양 후보만 고른다.
const SHAPE_FROM = 15;         // 이 레벨부터
const SHAPE_EVERY_RAMP = 5;    // 램프 구간 간격
const SHAPE_EVERY_PLATEAU = 4; // 정체기는 더 자주 섞어 1000판 동안 지루하지 않게 한다

interface Cfg { side: number; per: number; shape: number | null }

function makeCandidate(cfg: Cfg): LevelData | null {
  if (cfg.shape === null) {
    const n = Math.max(2, Math.round((cfg.side * cfg.side) / cfg.per));
    return generateLevel(cfg.side, cfg.side, n, 0.35);
  }
  const raw = buildMask(SHAPES[cfg.shape], cfg.side, cfg.side);
  if (raw.length < 8) return null;
  const { mask, cols, rows } = fitMask(raw);
  const n = Math.max(2, Math.round(mask.length / cfg.per));
  return generateShapedLevel(mask, cols, rows, n, 0.35);
}

// ── 생성 ─────────────────────────────────────────────────────────────────────

interface Stage extends LevelData {
  level: number;
  shape: string | null;
  minMoves: number;
  searchCost: number;
}


// 1) 후보 풀을 넓게 만든다.
//    한 레벨의 난이도는 편차가 커서(같은 설정이어도 배치에 따라 몇 배씩 차이난다)
//    설정별 평균으로 고르면 실제 값이 목표에서 크게 벗어난다.
//    그래서 실물 레벨을 많이 만들어 두고 "측정값"으로 줄을 세운다.
console.log('후보 풀 생성 중...');

const pool: { lv: LevelData; cost: number; cfg: Cfg }[] = [];

function addCandidates(cfg: Cfg, n: number, runs: number) {
  for (let k = 0; k < n; k++) {
    const lv = makeCandidate(cfg);
    if (!lv) continue;
    const cost = measure(lv, runs);
    if (cost === null) continue;
    pool.push({ lv, cost, cfg });
  }
}

// 50판짜리 풀보다 훨씬 깊게 판다 — 정체기(301~1000)가 상급 구간에서만
// 700판어치 서로 다른 후보를 뽑아야 하므로, 특히 side>=16 대역이 얇으면 금방 바닥난다.
for (let side = 4; side <= MAX_SIDE; side++) {
  for (const per of [3, 4, 5, 6, 7, 8, 10]) {
    if (Math.round((side * side) / per) < 2) continue;
    const heavy = side >= 16;
    addCandidates({ side, per, shape: null }, heavy ? 10 : 6, heavy ? 2 : 2);
  }
}
// 모양 후보. 복잡한 실루엣은 칸이 적으면 뭉개지므로 shapes.ts 의 minSide 로 걸러진다.
for (const side of [8, 9, 10, 12, 14, 16, 18, 20]) {
  for (let si = 0; si < SHAPES.length; si++) {
    if (side < (SHAPES[si].minSide ?? 0)) continue;
    for (const per of [4, 5, 6, 8]) {
      const heavy = side >= 16;
      addCandidates({ side, per, shape: si }, heavy ? 6 : 4, heavy ? 2 : 2);
    }
  }
}

pool.sort((a, b) => a.cost - b.cost);
console.log(`후보 ${pool.length}개, 난이도 ${pool[0].cost.toFixed(1)} ~ ${pool[pool.length - 1].cost.toFixed(0)}\n`);

// 2) 초반 10레벨은 별도로 만든다.
//    피스가 2~5개뿐인 판은 만들 수 있는 탐색비용 값이 몇 개 없어(양자화) 전부 1.0 근처로 뭉친다.
//    이 구간의 체감 진행은 난이도 수치가 아니라 "판이 커지고 피스가 늘어나는 것"이므로
//    피스 수를 정해놓고 올린다.
const INTRO: { side: number; pieces: number }[] = [
  { side: 4, pieces: 2 }, { side: 4, pieces: 3 }, { side: 5, pieces: 4 }, { side: 5, pieces: 5 },
  { side: 6, pieces: 6 }, { side: 6, pieces: 7 }, { side: 7, pieces: 9 }, { side: 7, pieces: 11 },
  { side: 8, pieces: 13 }, { side: 8, pieces: 16 },
];

const intro: typeof pool = [];
for (const { side, pieces } of INTRO) {
  const cands: typeof pool = [];
  for (let k = 0; k < 10; k++) {
    const lv = generateLevel(side, side, pieces, 0.3);
    if (!lv) continue;
    const cost = measure(lv, 6);
    if (cost === null) continue;
    cands.push({ lv, cost, cfg: { side, per: Math.round((side * side) / pieces), shape: null } });
  }
  if (!cands.length) { console.error(`도입부 ${side}x${side} ${pieces}피스 생성 실패`); process.exit(1); }
  cands.sort((a, b) => a.cost - b.cost);

  // 피스 수는 정해져 있으니, 그 안에서 난이도가 앞 레벨보다 낮지 않은 것을 고른다.
  // (비용 0 = 모든 피스가 처음부터 자유로운 판이라 퍼즐이 아니다. 최소 하나는 막혀 있어야 한다.)
  const prev = intro.length ? intro[intro.length - 1].cost : 0.5;
  const ok = cands.filter(c => c.cost >= prev);
  intro.push(ok.length ? ok[0] : cands[cands.length - 1]);
}

// 3) 목표값마다 가장 가까운 후보를 집는다.
// 비용 0짜리(모든 피스가 처음부터 자유로운 판)가 섞여 있으므로 하한을 양수로 잡는다.
// 등비 곡선은 0에서 출발할 수 없다.
const RAMP_COUNT = RAMP_END - INTRO.length;          // 11~300, 290판
const PLATEAU_COUNT = COUNT - RAMP_END;              // 301~1000, 700판
// 이음매는 여유를 두고 넘긴다. 재측정 때 값이 흔들려도 도입부보다 낮아지지 않도록.
const lo = Math.max(intro[intro.length - 1].cost * 1.4, 1.5);
// 램프의 정점 — 풀 최댓값(hiMax)보다 낮게 잡아 정체기가 더 올라갈 여지를 남긴다.
const hiRamp = pool[Math.floor(pool.length * 0.85)].cost;
// 정체기가 오르내리는 실질 상한. 이상치 하나에 끌려가지 않게 상위 2% 지점을 쓴다.
const hiMax = pool[Math.floor(pool.length * 0.98)].cost;
// 정체기 한 주기의 바닥 — 도입부보다는 항상 위, 램프 정점보다는 낮아 "완화"가 느껴진다.
const bandLow = hiRamp * 0.6;

const picks: typeof pool = [];
const used = new Set<(typeof pool)[number]>();
console.log('레벨 선정 중(후보를 정밀 측정)...');
let lastCost = lo;
let nextShapeLevel = SHAPE_FROM;

function accurate(lv: LevelData): number | null {
  return measure(lv, lv.pieces.length > 80 ? 4 : 9);
}

// 풀에서 목표 비용에 가장 가까운, 아직 안 쓴 후보를 찾는다.
// 대충 잰 값으로 추린 뒤 그것들만 정밀 측정한다 — 풀 전체를 정밀 측정하기엔 너무 비싸다.
function pickFromPool(target: number, wantShape: boolean, minCost: number): (typeof pool)[number] | null {
  const sameKind = pool.filter(c => !used.has(c) && (c.cfg.shape !== null) === wantShape);
  const shortlist = sameKind
    .filter(c => c.cost > minCost * 0.8)
    .sort((a, b) => Math.abs(Math.log(a.cost / target)) - Math.abs(Math.log(b.cost / target)))
    .slice(0, 8);

  let best: (typeof pool)[number] | null = null;
  let bestScore = Infinity;
  for (const cand of shortlist) {
    const acc = accurate(cand.lv);
    used.add(cand);   // 정밀 측정까지 한 후보는 다시 쓰지 않는다
    if (acc === null || acc <= minCost) continue;
    const score = Math.abs(Math.log(acc / target));
    if (score < bestScore) { bestScore = score; best = { ...cand, cost: acc }; }
  }
  if (!best) {
    for (const cand of sameKind.sort((a, b) => a.cost - b.cost)) {
      if (used.has(cand)) continue;
      const acc = accurate(cand.lv);
      used.add(cand);
      if (acc !== null && acc > minCost) { best = { ...cand, cost: acc }; break; }
    }
  }
  return best;
}

// 풀이 바닥나면(정체기 후반, 상급 대역에서 특히 자주 벌어진다) 그 자리에서 새로 만든다.
// 풀에만 의존하면 700판을 감당할 만큼 서로 다른 고난도 후보를 미리 다 채워둘 수 없다.
function generateFresh(target: number, wantShape: boolean, minCost: number): (typeof pool)[number] | null {
  const sides = wantShape ? [10, 12, 14, 16, 18, 20] : [12, 14, 16, 18, 20];
  let best: (typeof pool)[number] | null = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 20; attempt++) {
    const side = sides[Math.floor(Math.random() * sides.length)];
    const per = [3, 4, 5, 6][Math.floor(Math.random() * 4)];
    const shape = wantShape ? Math.floor(Math.random() * SHAPES.length) : null;
    if (wantShape && shape !== null && side < (SHAPES[shape].minSide ?? 0)) continue;
    const cfg: Cfg = { side, per, shape };
    const lv = makeCandidate(cfg);
    if (!lv) continue;
    const acc = accurate(lv);
    if (acc === null || acc <= minCost) continue;
    const score = Math.abs(Math.log(acc / target));
    if (score < bestScore) { bestScore = score; best = { lv, cost: acc, cfg }; }
    if (score < 0.05) break; // 충분히 가까우면 더 찾지 않는다
  }
  return best;
}

function pick(target: number, wantShape: boolean, minCost: number, level: number): (typeof pool)[number] {
  const best = pickFromPool(target, wantShape, minCost) ?? generateFresh(target, wantShape, minCost);
  if (!best) {
    console.error(`L${level} 후보 없음 (모양=${wantShape}, 목표 ${target.toFixed(1)}, 하한 ${minCost.toFixed(1)})`);
    process.exit(1);
  }
  return best;
}

// 램프(11~300): 등비 곡선으로 단조 증가. "직전보다 비싼 것만" 을 하한으로 강제한다.
for (let i = 0; i < RAMP_COUNT; i++) {
  const level = INTRO.length + i + 1;
  const target = lo * Math.pow(hiRamp / lo, i / (RAMP_COUNT - 1));
  const wantShape = level >= nextShapeLevel;
  const best = pick(target, wantShape, lastCost, level);
  picks.push(best);
  lastCost = best.cost;
  if (wantShape) nextShapeLevel += SHAPE_EVERY_RAMP;
}

// 정체기(301~1000): 판 크기가 이미 상한에 가까워 계속 단조 증가시킬 여지가 없다.
// 대신 CYCLE판 주기로 bandLow~hiMax 사이를 오르내린다 — 상급자에게는 계속 도전이 되면서도
// 램프처럼 끝없이 새 최고난도를 요구하지 않는다.
for (let i = 0; i < PLATEAU_COUNT; i++) {
  const level = RAMP_END + i + 1;
  const phase = i % CYCLE;
  const riseFrac = phase < CYCLE_RISE
    ? phase / (CYCLE_RISE - 1)
    : 1 - (phase - CYCLE_RISE) / (CYCLE - CYCLE_RISE - 1);
  const target = bandLow + (hiMax - bandLow) * Math.max(0, Math.min(1, riseFrac));
  const wantShape = level >= nextShapeLevel;
  // 정체기는 굴곡이 있어 직전보다 낮아질 수 있다 — 최소선은 도입부보다 항상 위인 bandLow*0.9.
  const minCost = bandLow * 0.9;
  const best = pick(target, wantShape, minCost, level);
  picks.push(best);
  lastCost = best.cost;
  if (wantShape) nextShapeLevel += SHAPE_EVERY_PLATEAU;
}

const ordered = picks;

const out: Stage[] = [...intro, ...ordered].map((p, i) => ({
  level: i + 1,
  ...p.lv,
  shape: p.cfg.shape === null ? null : SHAPES[p.cfg.shape].name,
  minMoves: p.lv.pieces.length,
  searchCost: Math.round(p.cost * 10) / 10,
}));

for (const s of out) {
  console.log(
    `L${String(s.level).padStart(2)}  ${(s.shape ?? '사각').padEnd(5)} ${s.gridCols}x${s.gridRows}  ` +
    `${String(s.pieces.length).padStart(3)}피스  비용 ${s.searchCost.toFixed(1).padStart(6)}`
  );
}

// 램프 구간(단조 증가)과 정체기(오르내림)는 성격이 달라 상승률을 따로 낸다.
const rampSteps = out.slice(1, RAMP_END).map((s, i) => s.searchCost / out[i].searchCost);
console.log(`\n램프(L${INTRO.length + 1}~L${RAMP_END}) 레벨당 상승률: 최소 ${(Math.min(...rampSteps) * 100 - 100).toFixed(0)}%  중앙값 ${((rampSteps.sort((a, b) => a - b)[Math.floor(rampSteps.length / 2)]) * 100 - 100).toFixed(0)}%  최대 ${(Math.max(...rampSteps) * 100 - 100).toFixed(0)}%`);
console.log(`정체기(L${RAMP_END + 1}~L${COUNT}) 비용 범위: ${bandLow.toFixed(1)} ~ ${hiMax.toFixed(1)} (주기 ${CYCLE}판마다 오르내림)`);

writeFileSync('src/features/arrow-puzzle/data/stages.json', JSON.stringify(out) + '\n');
console.log(`${out.length}개 저장 → src/features/arrow-puzzle/data/stages.json`);

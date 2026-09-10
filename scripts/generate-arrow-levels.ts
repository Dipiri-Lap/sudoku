/**
 * 애로우 퍼즐 캠페인 레벨 50개 생성.
 *
 * 난이도 = "지금 나갈 수 있는 피스를 찾는 탐색 비용"이다.
 * (피스는 판에서 나가기만 하므로 순서를 잘못 골라 막히는 일이 없다 —
 *  즉 계획이 아니라 탐색만이 난이도다.)
 * 무작위로 누르는 플레이어의 기대 헛클릭 수로 이를 정량화하고,
 * 레벨마다 약 15%씩 오르는 등비 곡선에 맞는 레벨을 골라 담는다.
 *
 *   npx tsx scripts/generate-arrow-levels.ts
 */
import { writeFileSync } from 'node:fs';
import { generateLevel, generateShapedLevel } from '../src/features/arrow-puzzle/utils/levelGenerator';
import type { LevelData, Direction, PieceData } from '../src/features/arrow-puzzle/data/levels';

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

// ── 모양 마스크 (노드에는 캔버스가 없으므로 기하학적으로 만든다) ──────────────

type Mask = [number, number][];

function build(cols: number, rows: number, f: (x: number, y: number) => boolean): Mask {
  const out: Mask = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) / (cols / 2);
      const y = (r - (rows - 1) / 2) / (rows / 2);
      if (f(x, y)) out.push([c, r]);
    }
  }
  return out;
}

const SHAPES: { name: string; make: (c: number, r: number) => Mask }[] = [
  { name: '원', make: (c, r) => build(c, r, (x, y) => Math.hypot(x, y) <= 1) },
  { name: '마름모', make: (c, r) => build(c, r, (x, y) => Math.abs(x) + Math.abs(y) <= 1) },
  { name: '십자', make: (c, r) => build(c, r, (x, y) => Math.abs(x) <= 0.38 || Math.abs(y) <= 0.38) },
  { name: '고리', make: (c, r) => build(c, r, (x, y) => { const d = Math.hypot(x, y); return d <= 1 && d >= 0.42; }) },
  { name: '별', make: (c, r) => build(c, r, (x, y) => { const a = Math.atan2(y, x); return Math.hypot(x, y) <= 0.55 + 0.45 * Math.abs(Math.cos(2.5 * a)); }) },
  { name: '모래시계', make: (c, r) => build(c, r, (x, y) => Math.abs(x) <= 0.25 + 0.75 * Math.abs(y)) },
  { name: '나비', make: (c, r) => build(c, r, (x, y) => Math.abs(y) <= 0.25 + 0.75 * Math.abs(x)) },
];

/** 마스크를 바운딩 박스에 맞춰 자른다 */
function fit(mask: Mask): { mask: Mask; cols: number; rows: number } {
  const cs = mask.map(([c]) => c);
  const rs = mask.map(([, r]) => r);
  const minC = Math.min(...cs), maxC = Math.max(...cs);
  const minR = Math.min(...rs), maxR = Math.max(...rs);
  return {
    mask: mask.map(([c, r]) => [c - minC, r - minR] as [number, number]),
    cols: maxC - minC + 1,
    rows: maxR - minR + 1,
  };
}

// ── 곡선 ─────────────────────────────────────────────────────────────────────

const COUNT = 50;
const MAX_SIDE = 20;    // 폰 화면 기준 격자 상한

interface Cfg { side: number; per: number; shape: number | null }

function makeCandidate(cfg: Cfg): LevelData | null {
  if (cfg.shape === null) {
    const n = Math.max(2, Math.round((cfg.side * cfg.side) / cfg.per));
    return generateLevel(cfg.side, cfg.side, n, 0.35);
  }
  const raw = SHAPES[cfg.shape].make(cfg.side, cfg.side);
  if (raw.length < 8) return null;
  const { mask, cols, rows } = fit(raw);
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

for (let side = 4; side <= MAX_SIDE; side++) {
  for (const per of [3, 4, 5, 6, 7, 8, 10]) {
    if (Math.round((side * side) / per) < 2) continue;
    const heavy = side >= 16;
    addCandidates({ side, per, shape: null }, heavy ? 2 : 4, heavy ? 1 : 2);
  }
}
for (const side of [10, 12, 14, 16, 18, 20]) {
  for (let si = 0; si < SHAPES.length; si++) {
    for (const per of [4, 5, 6, 8]) {
      const heavy = side >= 16;
      addCandidates({ side, per, shape: si }, heavy ? 1 : 2, heavy ? 1 : 2);
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

// 3) 등비 곡선 위의 목표값마다 가장 가까운 후보를 집는다.
//    풀이 정렬돼 있으므로 앞에서부터 훑으면 단조 증가가 저절로 보장된다.
// 비용 0짜리(모든 피스가 처음부터 자유로운 판)가 섞여 있으므로 하한을 양수로 잡는다.
// 등비 곡선은 0에서 출발할 수 없다.
// 도입부가 끝난 지점부터 곡선을 이어 붙인다.
const REST = COUNT - INTRO.length;
// 이음매는 여유를 두고 넘긴다. 재측정 때 값이 흔들려도 도입부보다 낮아지지 않도록.
const lo = Math.max(intro[intro.length - 1].cost * 1.4, 1.5);
// 최고 난이도는 이상치 하나에 끌려가지 않게 상위 5% 지점을 상한으로 쓴다.
const hi = pool[Math.floor(pool.length * 0.95)].cost;
const picks: typeof pool = [];
let cursor = pool.findIndex(p => p.cost >= lo);
if (cursor < 0) cursor = 0;

for (let i = 0; i < REST; i++) {
  const target = lo * Math.pow(hi / lo, i / (REST - 1));
  const room = pool.length - cursor - (REST - i - 1);   // 뒤 레벨 몫은 남겨둔다
  let bestIdx = cursor;
  let bestScore = Infinity;
  for (let j = cursor; j < cursor + Math.max(1, room); j++) {
    const score = Math.abs(Math.log(pool[j].cost / target));
    if (score < bestScore) { bestScore = score; bestIdx = j; }
  }
  picks.push(pool[bestIdx]);
  cursor = bestIdx + 1;
}

// 4) 곡선 구간은 표본을 늘려 다시 측정하고 그 값으로 정렬한다.
//    도입부는 수치가 아니라 피스 수로 진행하므로 순서를 그대로 둔다.
console.log('선택한 레벨 재측정 중...');
const rescored = picks.map(p => {
  const runs = p.lv.pieces.length > 80 ? 4 : 10;
  return { ...p, cost: measure(p.lv, runs) ?? p.cost };
});
rescored.sort((a, b) => a.cost - b.cost);

const out: Stage[] = [...intro, ...rescored].map((p, i) => ({
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

const steps = out.slice(1).map((s, i) => s.searchCost / out[i].searchCost);
console.log(`\n레벨당 상승률: 최소 ${(Math.min(...steps) * 100 - 100).toFixed(0)}%  중앙값 ${((steps.sort((a, b) => a - b)[Math.floor(steps.length / 2)]) * 100 - 100).toFixed(0)}%  최대 ${(Math.max(...steps) * 100 - 100).toFixed(0)}%`);

writeFileSync('src/features/arrow-puzzle/data/stages.json', JSON.stringify(out) + '\n');
console.log(`${out.length}개 저장 → src/features/arrow-puzzle/data/stages.json`);

/**
 * 하이라이트 자리(5, 15, 25... 중 지정 범위)를 일반(사각) 스테이지로 다시 만든다.
 *
 * 모양 스테이지를 "10스테이지마다"로 통일하면서, 100번 이후 끝자리 5 자리에 있던 모양을 뒤로 밀었다.
 * 비게 된 끝자리 5 자리는 원래 설계대로 하이라이트(이웃 곡선의 1.6배) 사각 판으로 채운다.
 * 판 크기·피스 수는 이웃 사각 스테이지를 기준으로 조금씩 키워 가며 목표에 가장 가까운 것을 고른다.
 *
 *   npx tsx scripts/regen-arrow-highlight-rects.ts --from=105 --to=495
 *   돌린 뒤 node scripts/split-arrow-stages.mjs 로 앱용 묶음을 다시 만든다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { generateLevel } from '../src/features/arrow-puzzle/utils/levelGenerator';
import type { LevelData, Direction, PieceData } from '../src/features/arrow-puzzle/data/levels';

const STAGES_PATH = process.env.STAGES_PATH ?? 'src/features/arrow-puzzle/data/stages.full.json';
const HIGHLIGHT_MULT = 1.6;
const MAX_COLS = 20;
const MAX_ROWS = 26;
const ASPECTS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 1.1, 1.25, 1.45];

const arg = (k: string, d: number) => {
  const a = process.argv.find(x => x.startsWith(`--${k}=`));
  return a ? Number(a.split('=')[1]) : d;
};
const FROM = arg('from', 105);
const TO = arg('to', 495);

// ── 난이도 측정 (generate-arrow-levels.ts 와 동일한 방식) ──────────────────────
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

interface Stage extends LevelData { level: number; shape: string | null; minMoves: number; searchCost: number }
const stages: Stage[] = JSON.parse(readFileSync(STAGES_PATH, 'utf-8'));

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const plainNeighbors = (level: number) => stages.filter(s =>
  Math.abs(s.level - level) <= 6 && !s.shape && s.level % 10 !== 5 && s.level !== level);

for (let level = FROM; level <= TO; level += 10) {
  if (level % 10 !== 5) { console.error(`L${level}: 끝자리 5가 아님`); process.exit(1); }
  const nb = plainNeighbors(level);
  const target = median(nb.map(s => s.searchCost)) * HIGHLIGHT_MULT;
  const baseArea = median(nb.map(s => s.gridCols * s.gridRows));
  const basePer = median(nb.map(s => (s.gridCols * s.gridRows) / s.pieces.length));

  const cands: { lv: LevelData; rough: number }[] = [];
  for (const areaMul of [1, 1.15, 1.3, 1.5]) {
    for (const perMul of [1, 0.85, 0.7, 0.55]) {
      for (let k = 0; k < 3; k++) {
        const side = Math.sqrt(baseArea * areaMul);
        const a = ASPECTS[Math.floor(Math.random() * ASPECTS.length)];
        const cols = Math.min(MAX_COLS, Math.max(3, Math.round(side * Math.sqrt(a))));
        const rows = Math.min(MAX_ROWS, Math.max(3, Math.round(side / Math.sqrt(a))));
        const n = Math.max(2, Math.round((cols * rows) / Math.max(3, basePer * perMul)));
        const lv = generateLevel(cols, rows, n, 0.35);
        if (!lv) continue;
        const rough = measure(lv, 3);
        if (rough === null || rough <= 0) continue;
        cands.push({ lv, rough });
      }
    }
  }
  if (!cands.length) { console.error(`L${level}: 후보 없음`); process.exit(1); }
  cands.sort((a, b) => Math.abs(Math.log(a.rough / target)) - Math.abs(Math.log(b.rough / target)));
  let best: { lv: LevelData; cost: number } | null = null;
  for (const c of cands.slice(0, 6)) {
    const cost = measure(c.lv, c.lv.pieces.length > 80 ? 6 : 12);
    if (cost === null || cost <= 0) continue;
    if (!best || Math.abs(Math.log(cost / target)) < Math.abs(Math.log(best.cost / target))) best = { lv: c.lv, cost };
  }
  if (!best) { console.error(`L${level}: 정밀 측정 실패`); process.exit(1); }

  const prev = stages[level - 1];
  stages[level - 1] = {
    level,
    ...best.lv,
    shape: null,
    minMoves: best.lv.pieces.length,
    searchCost: Math.round(best.cost * 10) / 10,
  };
  console.log(
    `L${level} ${prev.shape ?? '사각'} → 사각 ${best.lv.gridCols}x${best.lv.gridRows} ` +
    `${String(best.lv.pieces.length).padStart(3)}피스  비용 ${best.cost.toFixed(1).padStart(6)}  (목표 ${target.toFixed(1)})`,
  );
}

writeFileSync(STAGES_PATH, JSON.stringify(stages) + '\n');
console.log(`저장 → ${STAGES_PATH}`);

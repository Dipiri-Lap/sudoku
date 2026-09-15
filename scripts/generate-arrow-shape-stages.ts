/**
 * 쉐이프 스테이지 전용 목록 생성.
 *
 * 메인 캠페인(generate-arrow-levels.ts)의 50개 중 8자리는 SHAPES 카탈로그에서
 * 무작위로 뽑히므로 매번 몇 종류는 빠진다. 이 스크립트는 추첨 없이
 * SHAPES 의 모든 모양을 하나씩 만들어 별도 목록(shape-stages.json)에 저장한다 —
 * "쉐이프 스테이지" 화면은 이 목록만 보여준다.
 *
 *   npx tsx scripts/generate-arrow-shape-stages.ts
 */
import { writeFileSync } from 'node:fs';
import { generateShapedLevel } from '../src/features/arrow-puzzle/utils/levelGenerator';
import type { LevelData, Direction, PieceData } from '../src/features/arrow-puzzle/data/levels';
import { SHAPES, buildMask, fitMask } from '../src/features/arrow-puzzle/utils/shapes';

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

// ── 생성 ─────────────────────────────────────────────────────────────────────

interface ShapeStage extends LevelData {
  level: number;
  shape: string;
  minMoves: number;
  searchCost: number;
}

const PER = 6;           // 칸당 평균 피스 크기 — 판이 커진 만큼 같이 올려서 피스 수가 폭증하지 않게 한다
const MIN_DETAIL_SIDE = 22; // 이보다 작으면 실루엣이 뭉개지므로 항상 이 이상에서 만든다

const out: ShapeStage[] = [];

for (let i = 0; i < SHAPES.length; i++) {
  const shape = SHAPES[i];
  const side = Math.max(shape.minSide ?? 0, MIN_DETAIL_SIDE);

  let best: { lv: LevelData; cost: number } | null = null;
  for (let attempt = 0; attempt < 25 && !best; attempt++) {
    const raw = buildMask(shape, side, side);
    if (raw.length < 8) continue;
    const { mask, cols, rows } = fitMask(raw);
    const n = Math.max(2, Math.round(mask.length / PER));
    const lv = generateShapedLevel(mask, cols, rows, n, 0.35);
    if (!lv) continue;
    const cost = measure(lv, 6);
    if (cost === null || cost <= 0) continue;
    best = { lv, cost };
  }

  if (!best) {
    console.error(`${shape.name} 생성 실패`);
    process.exit(1);
  }

  out.push({
    level: i + 1,
    ...best.lv,
    shape: shape.name,
    minMoves: best.lv.pieces.length,
    searchCost: Math.round(best.cost * 10) / 10,
  });
  console.log(
    `${String(i + 1).padStart(2)}  ${shape.name.padEnd(5)} ${best.lv.gridCols}x${best.lv.gridRows}  ` +
    `${String(best.lv.pieces.length).padStart(3)}피스  비용 ${best.cost.toFixed(1)}`
  );
}

writeFileSync('src/features/arrow-puzzle/data/shape-stages.json', JSON.stringify(out) + '\n');
console.log(`${out.length}개 저장 → src/features/arrow-puzzle/data/shape-stages.json`);

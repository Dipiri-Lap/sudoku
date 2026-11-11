/**
 * Append new Queens stages that follow the steady 10-stage difficulty template.
 *
 * Band ranges are learned from the current steady section (stages > RAMP_END):
 * each stage position (id % 10) maps to a band, and a generated board is used
 * only if its perceived difficulty falls inside that band's range. Every 50th
 * stage is a 2-crown stage.
 *
 * Usage:
 *   npx tsx scripts/queens-append.ts --count 50              # append 50 stages
 *   npx tsx scripts/queens-append.ts --count 50 --dry        # report only, don't write
 *   npx tsx scripts/queens-append.ts --count 50 --sizes 8,9,10,11,12 --double-size 10
 *   npx tsx scripts/queens-append.ts --count 200 --add-size 12:30   # steady mix + 12×12 (~10%)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateLevel, generateDoubleLevel } from '../src/features/queens/utils/generator.js';
import { LEVELS_PATH, RAMP_END, TEMPLATE, BAND_NAME, isFixed, isDoubleSlot, rateGrid, report, type Level } from './queens-difficulty.js';

const arg = (name: string, def?: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const COUNT = Number(arg('--count', '50'));
const DRY = process.argv.includes('--dry');
const DOUBLE_SIZE = Number(arg('--double-size', '10'));
const SIZES_ARG = arg('--sizes');
const MAX_CANDIDATES = Number(arg('--max-candidates', '20000'));
const ATTEMPTS: Record<number, number> = { 5: 300, 6: 500, 7: 800, 8: 1500, 9: 3000, 10: 5000, 11: 8000, 12: 12000 };
// steady section = stages after the ramp that were not themselves appended with extra sizes
const STEADY_MAX_ID = Number(arg('--learn-until', '600'));

const raw = fs.readFileSync(LEVELS_PATH, 'utf-8');
const levels: Level[] = JSON.parse(raw);
const seen = new Set(levels.map(l => l.grid.flat().join(',')));

// ---- learn band ranges from the steady section
const steady = levels.filter(L => !isFixed(L) && L.id > RAMP_END && L.id <= STEADY_MAX_ID).map(L => ({ L, p: rateGrid(L.grid).perceived }));
if (steady.length < 50) throw new Error('steady section too small to learn bands');
const bandVals: number[][] = Array.from({ length: 8 }, () => []);
steady.forEach(({ L, p }) => bandVals[TEMPLATE[L.id % 10]].push(p));
const bandMin = bandVals.map(v => Math.min(...v));
const bandMax = bandVals.map(v => Math.max(...v));
// contiguous buckets: boundaries halfway between adjacent bands
const lo: number[] = [], hi: number[] = [];
for (let b = 0; b < 8; b++) {
  lo[b] = b === 0 ? bandMin[0] - 1.5 : (bandMax[b - 1] + bandMin[b]) / 2;
  hi[b] = b === 7 ? Infinity : (bandMax[b] + bandMin[b + 1]) / 2;
}
const bandOf = (p: number) => { for (let b = 0; b < 8; b++) if (p >= lo[b] && p < hi[b]) return b; return -1; };

// size mix: user-specified, else the steady section's mix
// --sizes 8,9,10 (equal weights) or 8:56,9:90,12:30 (explicit weights); --add-size 12:30 adds to the steady mix
const steadyMix = Object.entries(steady.reduce<Record<number, number>>((m, x) => ((m[x.L.size] = (m[x.L.size] || 0) + 1), m), {})).map(([s, w]) => [Number(s), w] as [number, number]);
const parseSizes = (s: string) => s.split(',').map(t => { const [n, w] = t.split(':'); return [Number(n), w ? Number(w) : 1] as [number, number]; });
const ADD_SIZE = arg('--add-size');
const sizeWeights: [number, number][] = SIZES_ARG ? parseSizes(SIZES_ARG) : [...steadyMix, ...(ADD_SIZE ? parseSizes(ADD_SIZE) : [])];
const totalW = sizeWeights.reduce((a, [, w]) => a + w, 0);
const pickSize = () => { let x = Math.random() * totalW; for (const [s, w] of sizeWeights) if ((x -= w) < 0) return s; return sizeWeights[0][0]; };

console.log('밴드 범위 (체감 난이도)');
for (let b = 0; b < 8; b++) console.log(`  ${b} ${BAND_NAME[b].padEnd(5)} ${lo[b].toFixed(1)} ~ ${hi[b] === Infinity ? '∞' : hi[b].toFixed(1)}`);
console.log('크기 비중', JSON.stringify(Object.fromEntries(sizeWeights)), '\n');

// ---- build new slots
const startId = Math.max(...levels.map(l => l.id)) + 1;
const newIds = [...Array(COUNT).keys()].map(i => startId + i);
const filled = new Map<number, Level>();
// 2-crown boards are slow to generate; cache them outside the repo so an interrupted run can resume
const DOUBLE_CACHE = path.join(os.tmpdir(), 'queens-double-cache.json');
const doubleCache: Record<number, Level> = fs.existsSync(DOUBLE_CACHE) ? JSON.parse(fs.readFileSync(DOUBLE_CACHE, 'utf-8')) : {};

for (const id of newIds.filter(isDoubleSlot)) {
  process.stdout.write(`  ${id}: 더블 ${DOUBLE_SIZE}×${DOUBLE_SIZE} 생성... `);
  let d = null;
  const cached = doubleCache[id];
  if (cached && cached.size === DOUBLE_SIZE && !seen.has(cached.grid.flat().join(','))) {
    seen.add(cached.grid.flat().join(','));
    filled.set(id, cached);
    console.log('OK (캐시)');
    continue;
  }
  // 10×10 doubles need ~20k attempts (~1 min each); 9×9 succeed well under 3k
  const attempts = DOUBLE_SIZE >= 10 ? 30000 : 3000;
  for (let t = 0; t < 10 && !d; t++) {
    const g = generateDoubleLevel(DOUBLE_SIZE, attempts);
    if (g && !seen.has(g.grid.flat().join(','))) d = g;
  }
  if (!d) { console.log('실패'); process.exit(1); }
  seen.add(d.grid.flat().join(','));
  const lvl: Level = { id, name: `레벨 ${id}`, size: d.size, grid: d.grid, colors: d.colors, queensPerColor: 2 };
  filled.set(id, lvl);
  doubleCache[id] = lvl;
  fs.writeFileSync(DOUBLE_CACHE, JSON.stringify(doubleCache)); // survive interruptions: rerun reuses these
  console.log('OK');
}

const pending = new Map<number, number[]>(); // band -> slot ids waiting
for (const id of newIds) if (!filled.has(id)) { const b = TEMPLATE[id % 10]; (pending.get(b) ?? pending.set(b, []).get(b)!).push(id); }
const remaining = () => [...pending.values()].reduce((a, v) => a + v.length, 0);

let candidates = 0;
const t0 = Date.now();
while (remaining() > 0 && candidates < MAX_CANDIDATES) {
  const n = pickSize();
  const g = generateLevel(n, ATTEMPTS[n] ?? 5000);
  candidates++;
  if (!g) continue;
  const key = g.grid.flat().join(',');
  if (seen.has(key)) continue;
  const r = rateGrid(g.grid);
  if (r.maxTier >= 5) continue; // never ship boards that need nested guessing
  const b = bandOf(r.perceived);
  const q = pending.get(b);
  if (!q || !q.length) continue;
  const id = q.shift()!;
  seen.add(key);
  filled.set(id, { id, name: `레벨 ${id}`, size: g.size, grid: g.grid, colors: g.colors });
  process.stdout.write(`\r  후보 ${candidates}개 생성, 남은 자리 ${remaining()}   `);
}
console.log(`\n  후보 ${candidates}개 / ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (remaining() > 0) {
  console.log(`  채우지 못한 자리: ${[...pending.values()].flat().sort((a, b) => a - b).join(', ')} → --max-candidates 를 늘려 다시 실행하세요.`);
  process.exit(1);
}

const out = [...levels, ...newIds.map(id => filled.get(id)!)];
console.log();
report(out.filter(L => L.id >= startId - 100));
if (!DRY) {
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(out, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
  console.log(`\n${newIds[0]}~${newIds[newIds.length - 1]} 추가 → ${LEVELS_PATH}`);
} else {
  console.log('\n(--dry: 파일은 그대로)');
}
